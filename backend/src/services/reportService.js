// Archivo: backend/src/services/reportService.js
// Consultas del módulo de coordinación y reportes del equipo.

const { db } = require('../db');
const { ErrorApp } = require('../middleware/errors');
const jornada = require('./jornadaService');
const actividades = require('./activityService');

const q = {
  usuarios: db.prepare(
    `SELECT id_usuario, nombre_completo, correo, id_rol, cargo, tiempo_jornada_horas, activo
     FROM usuarios ORDER BY activo DESC, nombre_completo`
  ),
  usuario: db.prepare(
    'SELECT id_usuario, nombre_completo, correo, id_rol, cargo, tiempo_jornada_horas, activo FROM usuarios WHERE id_usuario = ?'
  ),
  // Operadores activos + cualquier otro usuario (líder, administrador) que haya marcado o tipificado ese día
  equipoDelDia: db.prepare(
    `SELECT u.id_usuario, u.nombre_completo, u.correo, u.id_rol, u.cargo, u.tiempo_jornada_horas, u.activo
     FROM usuarios u
     WHERE u.activo = 1 AND (
       u.id_rol = 1
       OR EXISTS (SELECT 1 FROM marcaciones m WHERE m.id_usuario = u.id_usuario AND m.fecha = ?)
       OR EXISTS (SELECT 1 FROM registros_actividad r WHERE r.id_usuario = u.id_usuario AND r.fecha_actividad = ?)
     )
     ORDER BY u.nombre_completo`
  ),
  totales: db.prepare(
    `SELECT COUNT(*) AS registros, COALESCE(SUM(tiempo_dedicado_minutos), 0) AS minutos
     FROM registros_actividad WHERE fecha_actividad BETWEEN ? AND ?`
  ),
  porPersona: db.prepare(
    `SELECT u.id_usuario, u.nombre_completo AS nombre, COUNT(r.id_registro) AS registros,
            COALESCE(SUM(r.tiempo_dedicado_minutos), 0) AS minutos
     FROM registros_actividad r JOIN usuarios u USING (id_usuario)
     WHERE r.fecha_actividad BETWEEN ? AND ?
     GROUP BY u.id_usuario ORDER BY minutos DESC`
  ),
  porTipo: db.prepare(
    `SELECT t.nombre AS tipo, COUNT(*) AS registros, COALESCE(SUM(r.tiempo_dedicado_minutos), 0) AS minutos
     FROM registros_actividad r JOIN tipos_actividad t USING (id_tipo_actividad)
     WHERE r.fecha_actividad BETWEEN ? AND ?
     GROUP BY t.id_tipo_actividad ORDER BY minutos DESC`
  ),
  detalle: db.prepare(
    `SELECT r.id_registro, u.nombre_completo, r.fecha_actividad, r.hora_registro, t.nombre AS tipo,
            r.codigo_referencia, r.descripcion, r.tiempo_dedicado_minutos
     FROM registros_actividad r
     JOIN usuarios u USING (id_usuario)
     JOIN tipos_actividad t USING (id_tipo_actividad)
     WHERE r.fecha_actividad BETWEEN ? AND ?
     ORDER BY r.fecha_actividad DESC, r.hora_registro DESC LIMIT 5000`
  ),
};

const conBooleano = (u) => (u ? { ...u, activo: Boolean(u.activo) } : u);

function listarUsuarios() {
  return q.usuarios.all().map(conBooleano);
}

function jornadaUsuario(idUsuario, fecha) {
  const usuario = conBooleano(q.usuario.get(idUsuario));
  if (!usuario) throw new ErrorApp('Funcionario no encontrado.', 404);
  return {
    usuario,
    metricas: jornada.calcularMetricas(idUsuario, fecha),
    actividades: actividades.listarDia(idUsuario, fecha),
  };
}

/** Todo el equipo operativo en una sola respuesta (visor global y Excel consolidado). */
// Datos de un mes (YYYY-MM) para el Excel mensual
const qMes = {
  usuariosConActividad: db.prepare(
    `SELECT DISTINCT u.id_usuario, u.nombre_completo
     FROM usuarios u
     WHERE u.activo = 1 AND (
       u.id_rol = 1
       OR EXISTS (SELECT 1 FROM marcaciones m WHERE m.id_usuario = u.id_usuario AND substr(m.fecha,1,7) = ?)
       OR EXISTS (SELECT 1 FROM registros_actividad r WHERE r.id_usuario = u.id_usuario AND substr(r.fecha_actividad,1,7) = ?)
     )
     ORDER BY u.nombre_completo`
  ),
  ticketsMes: db.prepare(
    `SELECT r.fecha_actividad, r.hora_registro, r.codigo_referencia, t.nombre AS tipo,
            r.descripcion, r.tiempo_dedicado_minutos
     FROM registros_actividad r JOIN tipos_actividad t USING (id_tipo_actividad)
     WHERE r.id_usuario = ? AND substr(r.fecha_actividad,1,7) = ?
     ORDER BY r.fecha_actividad, r.hora_registro`
  ),
  marcacionesMes: db.prepare(
    `SELECT fecha, hora, tipo, duracion_break_minutos
     FROM marcaciones WHERE id_usuario = ? AND substr(fecha,1,7) = ?
     ORDER BY fecha, hora, id_marcacion`
  ),
  muertosMes: db.prepare(
    `SELECT fecha, hora_inicio, hora_fin, duracion_minutos
     FROM tiempos_muertos WHERE id_usuario = ? AND substr(fecha,1,7) = ?
     ORDER BY fecha, hora_inicio`
  ),
};

/** Devuelve, por funcionario, sus tickets, marcaciones y tiempos muertos del mes (YYYY-MM). */
function equipoMes(mes) {
  if (!/^\d{4}-\d{2}$/.test(String(mes))) throw new ErrorApp('Mes no válido. Use AAAA-MM.');
  return qMes.usuariosConActividad.all(mes, mes).map((u) => ({
    usuario: u,
    tickets: qMes.ticketsMes.all(u.id_usuario, mes),
    marcaciones: qMes.marcacionesMes.all(u.id_usuario, mes),
    tiempos_muertos: qMes.muertosMes.all(u.id_usuario, mes),
  }));
}

function equipoDia(fecha) {
  return q.equipoDelDia.all(fecha, fecha).map((u) => ({
    usuario: conBooleano(u),
    metricas: jornada.calcularMetricas(u.id_usuario, fecha),
    actividades: actividades.listarDia(u.id_usuario, fecha),
  }));
}

function resumen(desde, hasta) {
  return {
    totales: q.totales.get(desde, hasta),
    porPersona: q.porPersona.all(desde, hasta),
    porTipo: q.porTipo.all(desde, hasta),
  };
}

function detalle(desde, hasta) {
  return q.detalle.all(desde, hasta);
}

module.exports = { listarUsuarios, jornadaUsuario, equipoDia, equipoMes, resumen, detalle };
