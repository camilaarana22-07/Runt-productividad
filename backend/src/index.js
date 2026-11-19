// Archivo: backend/src/index.js
// Punto de entrada: valida configuración, abre la base de datos y levanta el servidor.

const { config, validarConfig } = require('./config');

try {
  validarConfig();
  require('./db'); // crea o verifica el esquema
} catch (err) {
  console.error(`No se pudo iniciar: ${err.message}`);
  process.exit(1);
}

const { crearApp } = require('./app');

crearApp().listen(config.puerto, '0.0.0.0', () => {
  console.log(`API RUNT escuchando en http://localhost:${config.puerto} (zona ${config.zonaHoraria})`);
});
