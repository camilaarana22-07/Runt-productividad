// Archivo: frontend/src/utils/equipo.js
// Carga la jornada de TODO el equipo para una fecha y arma el Excel consolidado.

import { downloadExcelHojas } from './excel';
import { jornadaLabel } from './format';
import { EVENT_LABEL, minutosMuertos } from './productividad';

let lotePendiente = true; // se apaga si el backend aún no tiene /reportes/equipo-dia

/** Ejecuta promesas con un máximo de peticiones simultáneas. */
async function enLotes(items, limite, fn) {
  const resultados = new Array(items.length);
  let siguiente = 0;
  async function trabajador() {
    while (siguiente < items.length) {
      const i = siguiente++;
      resultados[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, items.length) }, trabajador));
  return resultados;
}

/**
 * Devuelve [{ usuario, metricas, actividades }] de todos los operadores activos.
 * Usa /reportes/equipo-dia (una sola petición) si existe; si no, consulta
 * /reportes/jornada-usuario por cada funcionario, que ya existe en el backend actual.
 */
export async function cargarEquipoDia(request, fecha, usuarios) {
  if (lotePendiente) {
    try {
      const lote = await request(`/reportes/equipo-dia?fecha=${fecha}`);
      if (Array.isArray(lote)) return lote;
    } catch {
      lotePendiente = false;
    }
  }

  const lista = usuarios || (await request('/reportes/usuarios'));
  const activos = lista.filter((u) => u.activo !== 0 && u.activo !== false);
  const operadores = activos.filter((u) => u.id_rol === 1);
  const objetivo = operadores.length ? operadores : activos;

  return enLotes(objetivo, 6, async (u) => {
    try {
      const r = await request(`/reportes/jornada-usuario?id_usuario=${u.id_usuario}&fecha=${fecha}`);
      return { usuario: r.usuario || u, metricas: r.metricas, actividades: r.actividades || [] };
    } catch (err) {
      return { usuario: u, metricas: null, actividades: [], error: err.message };
    }
  });
}

const FILA_VACIA = {
  Sección: '',
  Funcionario: '',
  Fecha: '',
  Hora: '',
  Referencia: '',
  Detalle: '',
  Observación: '',
  Minutos: '',
  Tickets: '',
  'Productividad %': '',
  'Tiempo laborado %': '',
  'Tiempo muerto (min)': '',
};

/** Matriz única: resumen por funcionario, tickets, marcaciones y tiempos muertos. */
export function filasConsolidado(equipo, fecha) {
  const ordenado = [...equipo].sort((a, b) =>
    a.usuario.nombre_completo.localeCompare(b.usuario.nombre_completo, 'es'));
  const resumen = [];
  const tickets = [];
  const marcas = [];
  const muertos = [];

  for (const { usuario, metricas, actividades } of ordenado) {
    const nombre = usuario.nombre_completo;
    resumen.push({
      ...FILA_VACIA,
      Sección: 'Resumen',
      Funcionario: nombre,
      Fecha: fecha,
      Detalle: metricas?.inactivo_ahora ? 'Sin gestión' : metricas ? jornadaLabel(metricas.estado?.estado || 'desconectado') : 'Sin datos',
      Tickets: metricas?.tickets ?? 0,
      'Productividad %': metricas?.productividad_pct ?? '',
      'Tiempo laborado %': metricas?.tiempo_laborado_pct ?? '',
      'Tiempo muerto (min)': metricas ? minutosMuertos(metricas) : '',
    });

    for (const t of actividades || []) {
      tickets.push({
        ...FILA_VACIA,
        Sección: 'Ticket',
        Funcionario: nombre,
        Fecha: fecha,
        Hora: t.hora_registro || '',
        Referencia: t.codigo_referencia,
        Detalle: t.tipo,
        Observación: t.descripcion || '',
        Minutos: t.tiempo_dedicado_minutos ?? '',
      });
    }
    for (const m of metricas?.marcaciones || []) {
      marcas.push({
        ...FILA_VACIA,
        Sección: 'Marcación',
        Funcionario: nombre,
        Fecha: fecha,
        Hora: m.hora,
        Detalle: EVENT_LABEL[m.tipo] || m.tipo,
        Minutos: m.duracion_break_minutos ?? '',
      });
    }
    for (const tm of metricas?.tiempos_muertos || []) {
      muertos.push({
        ...FILA_VACIA,
        Sección: 'Tiempo muerto',
        Funcionario: nombre,
        Fecha: fecha,
        Hora: tm.hora_inicio,
        Detalle: tm.hora_fin ? `${tm.hora_inicio} a ${tm.hora_fin}` : `Desde ${tm.hora_inicio} (abierto)`,
        Minutos: tm.duracion_minutos ?? '',
      });
    }
  }

  const porHora = (a, b) => a.Funcionario.localeCompare(b.Funcionario, 'es') || String(a.Hora).localeCompare(String(b.Hora));
  return [...resumen, ...tickets.sort(porHora), ...marcas.sort(porHora), ...muertos.sort(porHora)];
}

export async function exportarConsolidado(request, fecha, equipoCargado) {
  const equipo = equipoCargado || (await cargarEquipoDia(request, fecha));
  const ordenado = [...equipo].sort((a, b) =>
    a.usuario.nombre_completo.localeCompare(b.usuario.nombre_completo, 'es'));
  if (!ordenado.length) throw new Error('No hay funcionarios para exportar en esa fecha.');

  // Una hoja "Resumen" del equipo + una hoja por funcionario.
  const resumen = ordenado.map(({ usuario, metricas }) => ({
    Funcionario: usuario.nombre_completo,
    Fecha: fecha,
    Estado: metricas
      ? (metricas.inactivo_ahora ? 'Sin gestión' : jornadaLabel(metricas.estado?.estado || 'desconectado'))
      : 'Sin datos',
    Tickets: metricas?.tickets ?? 0,
    'Productividad %': metricas?.productividad_pct ?? '',
    'Tiempo laborado %': metricas?.tiempo_laborado_pct ?? '',
    'Tiempo muerto (min)': metricas ? minutosMuertos(metricas) : '',
  }));

  const hojas = [{ nombre: 'Resumen', filas: resumen }];
  const usados = new Set();
  for (const { usuario, metricas, actividades } of ordenado) {
    const filas = [
      ...(actividades || []).map((t) => ({
        Sección: 'Ticket', Hora: t.hora_registro || '', 'Nro Ticket': t.codigo_referencia,
        Tipificación: t.tipo, Observación: t.descripcion || '', Minutos: t.tiempo_dedicado_minutos ?? '',
      })),
      ...(metricas?.marcaciones || []).map((m) => ({
        Sección: 'Marcación', Hora: m.hora, 'Nro Ticket': '',
        Tipificación: EVENT_LABEL[m.tipo] || m.tipo, Observación: '', Minutos: m.duracion_break_minutos ?? '',
      })),
      ...(metricas?.tiempos_muertos || []).map((t) => ({
        Sección: 'Tiempo muerto', Hora: t.hora_inicio, 'Nro Ticket': '',
        Tipificación: t.hora_fin ? `${t.hora_inicio} a ${t.hora_fin}` : `Desde ${t.hora_inicio} (abierto)`,
        Observación: '', Minutos: t.duracion_minutos ?? '',
      })),
    ].sort((a, b) => String(a.Hora).localeCompare(String(b.Hora)));

    // Nombre de hoja único y válido para Excel (máx. 31 caracteres, sin símbolos prohibidos).
    let nombre = usuario.nombre_completo.replace(/[\\/?*[\]:]/g, ' ').slice(0, 28).trim() || 'Funcionario';
    let base = nombre; let i = 2;
    while (usados.has(nombre.toLowerCase())) { nombre = `${base.slice(0, 25)} ${i++}`; }
    usados.add(nombre.toLowerCase());
    hojas.push({ nombre, filas: filas.length ? filas : [{ Sección: 'Sin registros en la fecha' }] });
  }

  downloadExcelHojas(`RUNT_consolidado_equipo_${fecha}.xlsx`, hojas);
  return ordenado.length;
}

/** Excel del mes: una hoja por funcionario con sus tickets, marcaciones y tiempos muertos. */
export async function exportarMensual(request, mes) {
  const equipo = await request(`/reportes/equipo-mes?mes=${mes}`);
  if (!Array.isArray(equipo) || !equipo.length) {
    throw new Error('No hay registros para ese mes.');
  }
  const hojas = [];
  const resumen = [];
  for (const { usuario, tickets, marcaciones, tiempos_muertos: muertos } of equipo) {
    resumen.push({
      Funcionario: usuario.nombre_completo,
      Mes: mes,
      Tickets: tickets.length,
      'Minutos declarados': tickets.reduce((s, t) => s + (Number(t.tiempo_dedicado_minutos) || 0), 0),
      'Tiempos muertos': muertos.length,
      'Minutos muertos': Math.round(muertos.reduce((s, t) => s + (Number(t.duracion_minutos) || 0), 0)),
    });
    const filas = [
      ...tickets.map((t) => ({
        Sección: 'Ticket', Fecha: t.fecha_actividad, Hora: t.hora_registro || '',
        'Nro Ticket': t.codigo_referencia, Tipificación: t.tipo, Observación: t.descripcion || '',
        Minutos: t.tiempo_dedicado_minutos ?? '',
      })),
      ...marcaciones.map((m) => ({
        Sección: 'Marcación', Fecha: m.fecha, Hora: m.hora, 'Nro Ticket': '',
        Tipificación: EVENT_LABEL[m.tipo] || m.tipo, Observación: '', Minutos: m.duracion_break_minutos ?? '',
      })),
      ...muertos.map((t) => ({
        Sección: 'Tiempo muerto', Fecha: t.fecha, Hora: t.hora_inicio, 'Nro Ticket': '',
        Tipificación: t.hora_fin ? `${t.hora_inicio} a ${t.hora_fin}` : `Desde ${t.hora_inicio} (abierto)`,
        Observación: '', Minutos: t.duracion_minutos ?? '',
      })),
    ].sort((a, b) => String(a.Fecha).localeCompare(String(b.Fecha)) || String(a.Hora).localeCompare(String(b.Hora)));

    let nombre = usuario.nombre_completo.replace(/[\\/?*[\]:]/g, ' ').slice(0, 28).trim() || 'Funcionario';
    hojas.push({ nombre, filas: filas.length ? filas : [{ Sección: 'Sin registros en el mes' }] });
  }
  downloadExcelHojas(`RUNT_${mes}_mensual.xlsx`, [{ nombre: 'Resumen', filas: resumen }, ...hojas]);
  return equipo.length;
}
