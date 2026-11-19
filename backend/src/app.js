// Archivo: backend/src/app.js
// Configura Express: seguridad, API bajo /api y, en producción, el frontend compilado.

const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { config } = require('./config');
const { rutaNoEncontrada, manejadorErrores } = require('./middleware/errors');

function crearApp() {
  const app = express();
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'"],
          upgradeInsecureRequests: config.cookieSegura ? [] : null,
        },
      },
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/jornada', require('./routes/jornada'));
  app.use('/api/actividades', require('./routes/activities'));
  app.use('/api/reportes', require('./routes/reports'));
  app.get('/api/salud', (req, res) => res.json({ ok: true }));
  app.use('/api', rutaNoEncontrada);

  // Producción: sirve frontend/dist (npm run build en frontend) con fallback de SPA.
  if (fs.existsSync(config.frontendDist)) {
    app.use(express.static(config.frontendDist));
    app.get('*', (req, res) => res.sendFile(path.join(config.frontendDist, 'index.html')));
  }

  app.use(manejadorErrores);
  return app;
}

module.exports = { crearApp };
