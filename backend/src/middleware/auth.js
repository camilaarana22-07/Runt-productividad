// Archivo: backend/src/middleware/auth.js
// JWT en cookie httpOnly (el JavaScript del navegador no puede leerla).
// También acepta "Authorization: Bearer <token>" para pruebas con Postman o integraciones.

const { verificarToken, usuarioPublico } = require('../services/authService');
const { hoy, esFechaValida } = require('../utils/tiempo');
const { ErrorApp } = require('./errors');

const COOKIE = 'runt_token';
const ROL = { OPERADOR: 1, LIDER: 2, ADMIN: 3 };

function extraerToken(req) {
  if (req.cookies && req.cookies[COOKIE]) return req.cookies[COOKIE];
  const cabecera = req.headers.authorization || '';
  return cabecera.startsWith('Bearer ') ? cabecera.slice(7) : null;
}

function autenticar(req, res, next) {
  const token = extraerToken(req);
  if (!token) return res.status(401).json({ error: 'Sesión no iniciada.' });
  let payload;
  try {
    payload = verificarToken(token);
  } catch {
    return res.status(401).json({ error: 'Su sesión expiró. Ingrese de nuevo.' });
  }
  // Se consulta el usuario en cada petición: si lo desactivan o le cambian el rol, aplica de inmediato.
  const usuario = usuarioPublico(payload.sub);
  if (!usuario || !usuario.activo) return res.status(401).json({ error: 'Usuario inactivo.' });
  req.usuario = usuario;
  next();
}

/** Líder de área (2) o administrador (3). */
function soloLider(req, res, next) {
  if (req.usuario.id_rol < ROL.LIDER) {
    return res.status(403).json({ error: 'Esta función es exclusiva de líderes de área.' });
  }
  next();
}

/** Lee ?fecha= (por defecto hoy en Colombia) y valida el formato. */
function fechaConsulta(req, campo = 'fecha') {
  const fecha = req.query[campo] || hoy();
  if (!esFechaValida(fecha)) throw new ErrorApp('Fecha no válida. Use AAAA-MM-DD.');
  return fecha;
}

function rangoConsulta(req) {
  const hasta = req.query.hasta || hoy();
  const desde = req.query.desde || '2000-01-01';
  if (!esFechaValida(desde) || !esFechaValida(hasta)) throw new ErrorApp('Rango de fechas no válido.');
  if (desde > hasta) throw new ErrorApp('La fecha "desde" no puede ser posterior a "hasta".');
  return { desde, hasta };
}

module.exports = { COOKIE, ROL, autenticar, soloLider, fechaConsulta, rangoConsulta };
