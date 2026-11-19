// Archivo: backend/src/config.js
// Carga y valida la configuración. Si falta algo crítico, el servidor no arranca.

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const num = (valor, porDefecto) => {
  const n = Number(valor);
  return Number.isFinite(n) && valor !== '' && valor != null ? n : porDefecto;
};

const config = {
  puerto: num(process.env.PORT, 3000),
  produccion: process.env.NODE_ENV === 'production',
  jwtSecreto: process.env.JWT_SECRET || '',
  jwtExpira: process.env.JWT_EXPIRA || '12h',
  dbPath: path.resolve(__dirname, '..', process.env.DB_PATH || './data/runt.db'),
  zonaHoraria: process.env.TZ_APP || 'America/Bogota',
  ticketsPorHora: num(process.env.TICKETS_POR_HORA, 6),
  umbralInactividadMin: num(process.env.UMBRAL_INACTIVIDAD_MIN, 15),
  jornadaDefaultHoras: num(process.env.JORNADA_DEFAULT_HORAS, 7.5),
  cookieSegura: process.env.COOKIE_SECURE === 'true',
  trustProxy: process.env.TRUST_PROXY ? num(process.env.TRUST_PROXY, 1) : false,
  frontendDist: path.resolve(__dirname, '..', '..', 'frontend', 'dist'),
};

function validarConfig() {
  if (config.jwtSecreto.length < 32) {
    throw new Error('JWT_SECRET falta o es muy corta (mínimo 32 caracteres). Revise backend/.env');
  }
}

module.exports = { config, validarConfig };
