// Archivo: backend/src/utils/tiempo.js
// Fecha y hora SIEMPRE del servidor en la zona de Colombia (America/Bogota, UTC-5).
// No se usa toISOString(): devuelve UTC y después de las 7:00 p. m. daría el día siguiente.

const { config } = require('../config');

const formateador = new Intl.DateTimeFormat('en-CA', {
  timeZone: config.zonaHoraria,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
});

/** { fecha: 'YYYY-MM-DD', hora: 'HH:MM:SS' } en hora de Colombia. */
function ahora() {
  const p = {};
  for (const parte of formateador.formatToParts(new Date())) p[parte.type] = parte.value;
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}:${p.second}` };
}

const hoy = () => ahora().fecha;

function aMinutos(hora) {
  const [h, m, s] = String(hora).split(':').map(Number);
  return h * 60 + (m || 0) + (s || 0) / 60;
}

function aHora(minutos) {
  const total = Math.max(0, Math.min(Math.round(minutos * 60), 24 * 3600 - 1));
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

const diferenciaMinutos = (inicio, fin) => Math.max(0, aMinutos(fin) - aMinutos(inicio));

function esFechaValida(fecha) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

const redondear = (n, decimales = 1) => Math.round(n * 10 ** decimales) / 10 ** decimales;

module.exports = { ahora, hoy, aMinutos, aHora, diferenciaMinutos, esFechaValida, redondear };
