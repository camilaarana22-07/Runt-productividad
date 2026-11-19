// Archivo: backend/src/services/activityService.js
// Tipificaciones (tickets). Solo se aceptan con el turno activo.

const { db } = require('../db');
const { ErrorApp } = require('../middleware/errors');
const { ahora } = require('../utils/tiempo');
const jornada = require('./jornadaService');

const CAMPOS = `r.id_registro, r.id_usuario, r.id_tipo_actividad, t.nombre AS tipo, r.codigo_referencia,
  r.descripcion, r.tiempo_dedicado_minutos, r.fecha_actividad, r.hora_registro`;

const q = {
  tipos: db.prepare('SELECT id_tipo_actividad, nombre FROM tipos_actividad WHERE activo = 1 ORDER BY nombre'),
  tipoActivo: db.prepare('SELECT minutos_estandar FROM tipos_actividad WHERE id_tipo_actividad = ? AND activo = 1'),
  yaExiste: db.prepare(
    'SELECT 1 FROM registros_actividad WHERE id_usuario = ? AND fecha_actividad = ? AND codigo_referencia = ? COLLATE NOCASE'
  ),
  insertar: db.prepare(
    `INSERT INTO registros_actividad
       (id_usuario, id_tipo_actividad, codigo_referencia, descripcion, tiempo_dedicado_minutos, fecha_actividad, hora_registro)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ),
  porId: db.prepare(
    `SELECT ${CAMPOS} FROM registros_actividad r JOIN tipos_actividad t USING (id_tipo_actividad) WHERE r.id_registro = ?`
  ),
  delDia: db.prepare(
    `SELECT ${CAMPOS} FROM registros_actividad r JOIN tipos_actividad t USING (id_tipo_actividad)
     WHERE r.id_usuario = ? AND r.fecha_actividad = ? ORDER BY r.hora_registro DESC, r.id_registro DESC`
  ),
  historial: db.prepare(
    `SELECT ${CAMPOS} FROM registros_actividad r JOIN tipos_actividad t USING (id_tipo_actividad)
     WHERE r.id_usuario = ? AND r.fecha_actividad BETWEEN ? AND ?
     ORDER BY r.fecha_actividad DESC, r.hora_registro DESC LIMIT 1000`
  ),
};

function listarTipos() {
  return q.tipos.all();
}

function validar(datos) {
  const idTipo = Number(datos.id_tipo_actividad);
  const codigo = String(datos.codigo_referencia ?? '').trim();
  const descripcion = String(datos.descripcion ?? '').trim();

  const tipo = Number.isInteger(idTipo) ? q.tipoActivo.get(idTipo) : null;
  if (!tipo) throw new ErrorApp('Seleccione una tipificación válida.');
  if (!codigo || codigo.length > 60) throw new ErrorApp('El número de ticket es obligatorio (máximo 60 caracteres).');
  if (descripcion.length > 1000) throw new ErrorApp('La observación admite máximo 1000 caracteres.');
  // El tiempo lo define la tipificación (estándar), no el operador.
  const minutos = tipo.minutos_estandar;
  return { idTipo, codigo, descripcion, minutos };
}

/** La fecha y la hora las fija el servidor (Colombia); se ignora la fecha que envíe el navegador. */
const crear = db.transaction((idUsuario, datos) => {
  const { idTipo, codigo, descripcion, minutos } = validar(datos);
  const { fecha, hora } = ahora();

  const estado = jornada.obtenerEstado(idUsuario, fecha);
  if (!estado.puede_tipificar) {
    const motivos = {
      desconectado: 'Debe marcar Inicio turno antes de tipificar.',
      inicio_break: 'No puede tipificar durante el break.',
      inicio_almuerzo: 'No puede tipificar durante el almuerzo.',
      fin_turno: 'Su turno ya finalizó; no se pueden registrar más tickets hoy.',
    };
    throw new ErrorApp(motivos[estado.estado] || 'No puede tipificar en este momento.', 409);
  }

  // Registrar un ticket es gestión: termina cualquier tiempo muerto abierto.
  if (q.yaExiste.get(idUsuario, fecha, codigo)) {
    throw new ErrorApp(`El ticket ${codigo} ya fue registrado hoy.`, 409);
  }
  jornada.cerrarTiempoMuertoAbierto(idUsuario, fecha, hora);
  const info = q.insertar.run(idUsuario, idTipo, codigo, descripcion, minutos, fecha, hora);
  return q.porId.get(info.lastInsertRowid);
});

function listarDia(idUsuario, fecha) {
  return q.delDia.all(idUsuario, fecha);
}

function historial(idUsuario, desde, hasta) {
  return q.historial.all(idUsuario, desde, hasta);
}

module.exports = { listarTipos, crear, listarDia, historial };
