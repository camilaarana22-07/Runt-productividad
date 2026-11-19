// Archivo: backend/src/services/authService.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { config } = require('../config');
const { ErrorApp } = require('../middleware/errors');

const q = {
  porCorreo: db.prepare('SELECT * FROM usuarios WHERE correo = ?'),
  porId: db.prepare(
    `SELECT u.id_usuario, u.nombre_completo, u.correo, u.id_rol, r.nombre AS rol, u.cargo,
            u.tiempo_jornada_horas, u.activo
     FROM usuarios u JOIN roles r USING (id_rol) WHERE u.id_usuario = ?`
  ),
  hash: db.prepare('SELECT password_hash FROM usuarios WHERE id_usuario = ?'),
  cambiarHash: db.prepare('UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?'),
};

// Hash ficticio: el tiempo de respuesta no revela si un correo existe.
const HASH_FICTICIO = bcrypt.hashSync('usuario-inexistente-runt', 12);

/** Forma pública del usuario que consume el frontend (sin datos sensibles). */
function usuarioPublico(id) {
  const u = q.porId.get(id);
  if (!u) return null;
  return {
    id_usuario: u.id_usuario,
    nombre: u.nombre_completo,
    nombre_completo: u.nombre_completo,
    correo: u.correo,
    id_rol: u.id_rol,
    rol: u.rol,
    cargo: u.cargo,
    tiempo_jornada_horas: u.tiempo_jornada_horas,
    activo: Boolean(u.activo),
  };
}

function login(correo, password) {
  const correoLimpio = String(correo || '').trim().toLowerCase();
  const clave = String(password || '');
  if (!correoLimpio || !clave) throw new ErrorApp('Ingrese correo y contraseña.');

  const u = q.porCorreo.get(correoLimpio);
  const valida = bcrypt.compareSync(clave, u ? u.password_hash : HASH_FICTICIO);
  if (!u || !valida || !u.activo) throw new ErrorApp('Correo o contraseña incorrectos.', 401);

  const token = jwt.sign({ sub: u.id_usuario, rol: u.id_rol }, config.jwtSecreto, { expiresIn: config.jwtExpira });
  return { token, usuario: usuarioPublico(u.id_usuario) };
}

function verificarToken(token) {
  return jwt.verify(token, config.jwtSecreto);
}

function cambiarPassword(idUsuario, actual, nueva) {
  const fila = q.hash.get(idUsuario);
  if (!fila || !bcrypt.compareSync(String(actual || ''), fila.password_hash)) {
    throw new ErrorApp('La contraseña actual no es correcta.', 400);
  }
  const clave = String(nueva || '');
  if (clave.length < 10) throw new ErrorApp('La nueva contraseña debe tener al menos 10 caracteres.');
  if (clave === actual) throw new ErrorApp('La nueva contraseña debe ser distinta de la actual.');
  q.cambiarHash.run(bcrypt.hashSync(clave, 12), idUsuario);
}

module.exports = { login, verificarToken, usuarioPublico, cambiarPassword };
