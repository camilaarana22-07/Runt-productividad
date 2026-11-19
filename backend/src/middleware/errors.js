// Archivo: backend/src/middleware/errors.js

class ErrorApp extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.status = status;
  }
}

function rutaNoEncontrada(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada.' });
}

// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(err);
  // Nunca se envían mensajes internos (SQL, rutas) al navegador.
  res.status(status).json({ error: status >= 500 ? 'Error interno del servidor.' : err.message });
}

module.exports = { ErrorApp, rutaNoEncontrada, manejadorErrores };
