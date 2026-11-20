// Archivo: backend/src/services/jornadaService.js
// Reglas de negocio de la jornada. El backend es la autoridad: el frontend solo refleja estas reglas.

const { db, TIPOS_MARCACION } = require('../db');
const { config } = require('../config');
const { ErrorApp } = require('../middleware/errors');
const { ahora, aMinutos, aHora, diferenciaMinutos, redondear } = require('../utils/tiempo');

const ETIQUETAS = {
  inicio_turno: 'Inicio turno',
  fin_turno: 'Final turno',
  inicio_break: 'Inicio break',
  fin_break: 'Final break',
  inicio_almuerzo: 'Inicio almuerzo',
  fin_almuerzo: 'Final almuerzo',
};

// Estado = último evento del día. Qué marcaciones se permiten desde cada estado:
const TRANSICIONES = {
  desconectado: ['inicio_turno'],
  inicio_turno: ['inicio_break', 'inicio_almuerzo', 'fin_turno'],
  fin_break: ['inicio_break', 'inicio_almuerzo', 'fin_turno'],
  fin_almuerzo: ['inicio_break', 'inicio_almuerzo', 'fin_turno'],
  inicio_break: ['fin_break'],
  inicio_almuerzo: ['fin_almuerzo'],
  fin_turno: [],
};
const ESTADOS_ACTIVOS = ['inicio_turno', 'fin_break', 'fin_almuerzo'];

const q = {
  usuario: db.prepare(
    'SELECT id_usuario, nombre_completo, id_rol, cargo, tiempo_jornada_horas FROM usuarios WHERE id_usuario = ?'
  ),
  marcaciones: db.prepare(
    'SELECT id_marcacion, tipo, fecha, hora, duracion_break_minutos, jornada_horas FROM marcaciones WHERE id_usuario = ? AND fecha = ? ORDER BY hora, id_marcacion'
  ),
  insertarMarcacion: db.prepare(
    'INSERT INTO marcaciones (id_usuario, tipo, fecha, hora, duracion_break_minutos, jornada_horas) VALUES (?, ?, ?, ?, ?, ?)'
  ),
  cambiarJornadaUsuario: db.prepare('UPDATE usuarios SET tiempo_jornada_horas = ? WHERE id_usuario = ?'),
  cambiarJornadaDia: db.prepare(
    "UPDATE marcaciones SET jornada_horas = ? WHERE id_usuario = ? AND fecha = ? AND tipo = 'inicio_turno'"
  ),
  tiemposMuertos: db.prepare(
    'SELECT id_tiempo_muerto, hora_inicio, hora_fin, duracion_minutos FROM tiempos_muertos WHERE id_usuario = ? AND fecha = ? ORDER BY hora_inicio, id_tiempo_muerto'
  ),
  tmAbierto: db.prepare(
    'SELECT * FROM tiempos_muertos WHERE id_usuario = ? AND fecha = ? AND hora_fin IS NULL ORDER BY id_tiempo_muerto DESC LIMIT 1'
  ),
  tmInsertar: db.prepare('INSERT INTO tiempos_muertos (id_usuario, fecha, hora_inicio) VALUES (?, ?, ?)'),
  tmCerrar: db.prepare('UPDATE tiempos_muertos SET hora_fin = ?, duracion_minutos = ? WHERE id_tiempo_muerto = ?'),
  tmUltimoFin: db.prepare('SELECT MAX(hora_fin) AS h FROM tiempos_muertos WHERE id_usuario = ? AND fecha = ?'),
  ticketsHoras: db.prepare(
    'SELECT hora_registro AS hora FROM registros_actividad WHERE id_usuario = ? AND fecha_actividad = ? ORDER BY hora_registro'
  ),
  resumenTickets: db.prepare(
    `SELECT COUNT(*) AS n, COALESCE(SUM(tiempo_dedicado_minutos), 0) AS minutos, MAX(hora_registro) AS ultima
     FROM registros_actividad WHERE id_usuario = ? AND fecha_actividad = ?`
  ),
  porHora: db.prepare(
    `SELECT CAST(substr(hora_registro, 1, 2) AS INTEGER) AS h, COUNT(*) AS total
     FROM registros_actividad WHERE id_usuario = ? AND fecha_actividad = ? GROUP BY 1`
  ),
};

// Solo los operadores (rol 1) acumulan tiempo muerto. Coordinadores/administradores no.
function esOperador(idUsuario) {
  const u = q.usuario.get(idUsuario);
  return u ? u.id_rol === 1 : false;
}

function estadoDesde(marcaciones) {
  const estado = marcaciones.length ? marcaciones[marcaciones.length - 1].tipo : 'desconectado';
  return {
    estado,
    puede_tipificar: ESTADOS_ACTIVOS.includes(estado),
    permitidas: TRANSICIONES[estado],
  };
}

function obtenerEstado(idUsuario, fecha = ahora().fecha) {
  return estadoDesde(q.marcaciones.all(idUsuario, fecha));
}

/** Cierra el tiempo muerto abierto a la hora indicada. Devuelve el registro cerrado o null. */
function cerrarTiempoMuertoAbierto(idUsuario, fecha, hora) {
  const abierto = q.tmAbierto.get(idUsuario, fecha);
  if (!abierto) return null;
  const duracion = redondear(diferenciaMinutos(abierto.hora_inicio, hora), 2);
  q.tmCerrar.run(hora, duracion, abierto.id_tiempo_muerto);
  return { ...abierto, hora_fin: hora, duracion_minutos: duracion };
}

/** Registra una marcación validando la secuencia. La fecha y hora las pone el servidor. */
const marcar = db.transaction((idUsuario, tipo, duracionProgramada) => {
  if (!TIPOS_MARCACION.includes(tipo)) throw new ErrorApp('Tipo de marcación no válido.');

  const { fecha, hora } = ahora();
  const marcaciones = q.marcaciones.all(idUsuario, fecha);
  const { estado, permitidas } = estadoDesde(marcaciones);

  if (!permitidas.includes(tipo)) {
    const motivos = {
      desconectado: 'Primero debe marcar Inicio turno.',
      inicio_break: 'Está en break. Marque Fin break antes de continuar.',
      inicio_almuerzo: 'Está en almuerzo. Marque Fin almuerzo antes de continuar.',
      fin_turno: 'El turno de hoy ya fue finalizado.',
    };
    throw new ErrorApp(motivos[estado] || `No puede marcar "${ETIQUETAS[tipo]}" en este momento.`, 409);
  }

  let duracion = null;
  if (tipo === 'inicio_break' && duracionProgramada != null) {
    const d = Number(duracionProgramada);
    if (!Number.isFinite(d) || d < 5 || d > 60) throw new ErrorApp('La duración del break debe estar entre 5 y 60 minutos.');
    duracion = d;
  }
  if (tipo === 'fin_break' || tipo === 'fin_almuerzo') {
    const tipoInicio = tipo === 'fin_break' ? 'inicio_break' : 'inicio_almuerzo';
    const inicio = [...marcaciones].reverse().find((m) => m.tipo === tipoInicio);
    duracion = redondear(diferenciaMinutos(inicio.hora, hora), 2);
  }

  // Un receso o el cierre de turno terminan cualquier inactividad abierta.
  if (['inicio_break', 'inicio_almuerzo', 'fin_turno'].includes(tipo)) {
    cerrarTiempoMuertoAbierto(idUsuario, fecha, hora);
  }

  const jornadaDia = tipo === 'inicio_turno' ? q.usuario.get(idUsuario).tiempo_jornada_horas : null;
  const info = q.insertarMarcacion.run(idUsuario, tipo, fecha, hora, duracion, jornadaDia);
  const nuevoEstado = estadoDesde([...marcaciones, { tipo }]);
  return {
    mensaje: `Registrado: ${ETIQUETAS[tipo]} a las ${hora.slice(0, 5)}`,
    marcacion: { id_marcacion: info.lastInsertRowid, tipo, fecha, hora, duracion_break_minutos: duracion },
    estado: nuevoEstado,
  };
});

/**
 * Abre un tiempo muerto. Inicio = ahora − max(umbral, minutos reportados), sin retroceder
 * antes de la última marcación, el último ticket o el fin de otro tiempo muerto.
 */
const abrirTiempoMuerto = db.transaction((idUsuario, minutosReportados) => {
  if (!esOperador(idUsuario)) return {}; // la coordinación no acumula tiempo muerto
  const { fecha, hora } = ahora();
  const marcaciones = q.marcaciones.all(idUsuario, fecha);
  if (!estadoDesde(marcaciones).puede_tipificar) {
    throw new ErrorApp('Solo se registra tiempo muerto con el turno activo.', 409);
  }
  const existente = q.tmAbierto.get(idUsuario, fecha);
  if (existente) return existente;

  const minutos = Math.min(Math.max(Number(minutosReportados) || 0, config.umbralInactividadMin), 12 * 60);
  const ahoraMin = aMinutos(hora);
  let inicioMin = ahoraMin - minutos;
  const referencias = [
    marcaciones[marcaciones.length - 1].hora,
    q.resumenTickets.get(idUsuario, fecha).ultima,
    q.tmUltimoFin.get(idUsuario, fecha).h,
  ];
  for (const h of referencias) if (h) inicioMin = Math.max(inicioMin, aMinutos(h));

  if (ahoraMin - inicioMin < 1) throw new ErrorApp('Hay gestión registrada muy reciente.', 409);

  const horaInicio = aHora(inicioMin);
  const info = q.tmInsertar.run(idUsuario, fecha, horaInicio);
  return { id_tiempo_muerto: info.lastInsertRowid, fecha, hora_inicio: horaInicio, hora_fin: null, duracion_minutos: null };
});

/** Cada funcionario ajusta sus propias horas: aplica desde hoy; los días anteriores no cambian. */
const cambiarMiJornada = db.transaction((idUsuario, valor) => {
  const horas = Number(valor);
  if (!Number.isFinite(horas) || horas < 1 || horas > 12) {
    throw new ErrorApp('Las horas de jornada deben estar entre 1 y 12.');
  }
  const redondeadas = Math.round(horas * 100) / 100;
  q.cambiarJornadaUsuario.run(redondeadas, idUsuario);
  q.cambiarJornadaDia.run(redondeadas, idUsuario, ahora().fecha);
  return { ok: true, horas: redondeadas, mensaje: `Jornada actualizada a ${redondeadas} h. Los indicadores se recalcularon.` };
});

function cerrarTiempoMuerto(idUsuario) {
  const { fecha, hora } = ahora();
  return cerrarTiempoMuertoAbierto(idUsuario, fecha, hora) || {};
}

/**
 * Deteccion automatica de tiempo muerto en el SERVIDOR (no depende del navegador).
 * Entre cada dos senales de actividad consecutivas del turno activo (inicio de turno,
 * fin de break/almuerzo y cada ticket) marca como tiempo muerto todo hueco de UMBRAL o
 * mas minutos. Los tramos de break y almuerzo quedan fuera de los intervalos activos, asi
 * que no cuentan. Es idempotente: no duplica lo ya registrado.
 */
const detectarTiempoMuertoAuto = db.transaction((idUsuario, fecha, hastaHora) => {
  if (!esOperador(idUsuario)) return; // la coordinación no acumula tiempo muerto
  const marcaciones = q.marcaciones.all(idUsuario, fecha);
  const inicio = marcaciones.find((m) => m.tipo === 'inicio_turno');
  if (!inicio) return;

  const activos = [];
  let desde = inicio.hora;
  for (const m of marcaciones) {
    if (m.tipo === 'inicio_break' || m.tipo === 'inicio_almuerzo') {
      if (desde) { activos.push([desde, m.hora]); desde = null; }
    } else if (m.tipo === 'fin_break' || m.tipo === 'fin_almuerzo') {
      desde = m.hora;
    } else if (m.tipo === 'fin_turno') {
      if (desde) { activos.push([desde, m.hora]); desde = null; }
    }
  }
  if (desde) activos.push([desde, hastaHora]);

  const umbral = config.umbralInactividadMin;
  const ticketHoras = q.ticketsHoras.all(idUsuario, fecha).map((r) => r.hora);
  const existentes = q.tiemposMuertos.all(idUsuario, fecha);

  for (const [ini, fin] of activos) {
    const senales = [ini, ...ticketHoras.filter((h) => h > ini && h < fin), fin].sort();
    for (let i = 0; i < senales.length - 1; i++) {
      const a = senales[i];
      const b = senales[i + 1];
      if (diferenciaMinutos(a, b) < umbral) continue;
      const yaCubierto = existentes.some((t) => t.hora_inicio <= a && (t.hora_fin || hastaHora) >= b);
      if (yaCubierto) continue;
      const abierto = b === hastaHora && !marcaciones.some((m) => m.tipo === 'fin_turno');
      const info = q.tmInsertar.run(idUsuario, fecha, a);
      if (!abierto) {
        q.tmCerrar.run(b, redondear(diferenciaMinutos(a, b), 2), info.lastInsertRowid);
      }
      existentes.push({ hora_inicio: a, hora_fin: abierto ? null : b });
    }
  }
});

/**
 * Métricas del día.
 *   pausas (min)       = break real + almuerzo real
 *   efectivo           = tiempo en turno − pausas − tiempo muerto
 *   productividad_%    = tiempo estándar gestionado / (jornada − pausas)
 *   tiempo_laborado_%  = tiempo estándar gestionado / jornada
 */
function calcularMetricas(idUsuario, fecha) {
  const usuario = q.usuario.get(idUsuario);
  if (!usuario) throw new ErrorApp('Usuario no encontrado.', 404);

  const reloj = ahora();
  const esHoy = fecha === reloj.fecha;

  // El servidor detecta por su cuenta los huecos de inactividad, aunque el operador
  // haya cerrado o minimizado la consola.
  const preMarcas = q.marcaciones.all(idUsuario, fecha);
  const finPre = preMarcas.find((m) => m.tipo === 'fin_turno');
  const hastaHora = finPre ? finPre.hora : (esHoy ? reloj.hora : (preMarcas.at(-1)?.hora || reloj.hora));
  detectarTiempoMuertoAuto(idUsuario, fecha, hastaHora);

  const marcaciones = q.marcaciones.all(idUsuario, fecha);
  const tiemposMuertos = q.tiemposMuertos.all(idUsuario, fecha);
  const tickets = q.resumenTickets.get(idUsuario, fecha);
  const estado = estadoDesde(marcaciones);

  const inicio = marcaciones.find((m) => m.tipo === 'inicio_turno');
  const fin = marcaciones.find((m) => m.tipo === 'fin_turno');

  // Hora de corte para lo que sigue abierto
  let corte;
  if (fin) corte = fin.hora;
  else if (esHoy) corte = reloj.hora;
  else {
    // Día pasado sin cierre de turno: se toma el último rastro conocido, sin inventar tiempo.
    corte = [
      marcaciones.length ? marcaciones[marcaciones.length - 1].hora : null,
      tickets.ultima,
      ...tiemposMuertos.map((t) => t.hora_fin),
    ].filter(Boolean).sort().pop() || '00:00:00';
  }

  let minBreak = 0;
  let minAlmuerzo = 0;
  for (const m of marcaciones) {
    if (m.tipo === 'fin_break') minBreak += m.duracion_break_minutos || 0;
    if (m.tipo === 'fin_almuerzo') minAlmuerzo += m.duracion_break_minutos || 0;
  }
  const ultima = marcaciones[marcaciones.length - 1];
  if (estado.estado === 'inicio_break') minBreak += diferenciaMinutos(ultima.hora, corte);
  if (estado.estado === 'inicio_almuerzo') minAlmuerzo += diferenciaMinutos(ultima.hora, corte);

  let minMuertos = 0;
  let abierto = false;
  const tmSalida = tiemposMuertos.map((t) => {
    if (t.hora_fin) {
      minMuertos += t.duracion_minutos || 0;
      return t;
    }
    abierto = true;
    const parcial = diferenciaMinutos(t.hora_inicio, corte);
    minMuertos += parcial;
    return { ...t, duracion_minutos: redondear(parcial, 2) };
  });

  // La jornada del día quedó guardada al marcar inicio de turno; si no hay turno, se usa la vigente.
  const jornada = inicio?.jornada_horas ?? usuario.tiempo_jornada_horas;
  const pausas = minBreak + minAlmuerzo;
  const brutos = inicio ? diferenciaMinutos(inicio.hora, corte) : 0;
  // minutos_laborados = suma de los minutos ESTÁNDAR de los tickets (definidos por tipificación).
  const minutosLaborados = tickets.minutos;               // suma de minutos estándar gestionados
  const jornadaMin = jornada * 60;                       // jornada completa en minutos
  const efectivos = Math.max(0, brutos - pausas - minMuertos);
  // Tiempo disponible = jornada menos las pausas (break y almuerzo).
  const disponibleMin = Math.max(0, jornadaMin - pausas);

  // Tickets por hora: desde la hora de INICIO DE TURNO (en punto) hasta el corte
  // (hora actual, o fin de turno si ya cerró). Sin turno iniciado, la tabla va vacía.
  const conteo = new Map(q.porHora.all(idUsuario, fecha).map((r) => [r.h, r.total]));
  const porHora = [];
  if (inicio) {
    const desde = Math.floor(aMinutos(inicio.hora) / 60);
    let hasta = Math.floor(aMinutos(corte) / 60);
    // Si hubo tickets en una hora posterior al corte (por datos atípicos), se incluye.
    for (const h of conteo.keys()) if (h > hasta) hasta = h;
    for (let h = desde; h <= hasta; h++) {
      porHora.push({ hora: `${String(h).padStart(2, '0')}:00`, total: conteo.get(h) || 0 });
    }
  }

  return {
    fecha,
    hora_servidor: reloj.hora,
    estado,
    inactivo_ahora: abierto && estado.puede_tipificar,
    marcaciones,
    tiempos_muertos: tmSalida,
    tickets: tickets.n,
    minutos_declarados: minutosLaborados,
    minutos_laborados: redondear(minutosLaborados),
    jornada_horas: jornada,
    jornada_minutos: jornadaMin,
    minutos_disponibles: redondear(disponibleMin),
    // Productividad: tiempo estándar gestionado sobre el tiempo disponible (jornada menos pausas).
    productividad_pct: disponibleMin > 0 ? redondear(Math.min(100, (minutosLaborados / disponibleMin) * 100)) : 0,
    // Tiempo laborado: tiempo estándar gestionado sobre la jornada completa.
    tiempo_laborado_pct: jornadaMin > 0 ? redondear(Math.min(100, (minutosLaborados / jornadaMin) * 100)) : 0,
    tiempo: {
      minutos_brutos: redondear(brutos),
      minutos_pausa: redondear(pausas),
      minutos_break: redondear(minBreak),
      minutos_almuerzo: redondear(minAlmuerzo),
      minutos_muertos: redondear(minMuertos),
      minutos_efectivos: redondear(efectivos),
    },
    por_hora: porHora,
    config: { umbral_inactividad_min: config.umbralInactividadMin },
  };
}

module.exports = {
  obtenerEstado,
  marcar,
  abrirTiempoMuerto,
  cerrarTiempoMuerto,
  cerrarTiempoMuertoAbierto,
  cambiarMiJornada,
  calcularMetricas,
};
