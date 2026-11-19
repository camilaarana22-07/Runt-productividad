// Archivo: backend/src/routes/jornada.js
// /api/jornada — cada usuario solo opera sobre su propia jornada (id tomado del token).

const express = require('express');
const jornada = require('../services/jornadaService');
const { autenticar, fechaConsulta } = require('../middleware/auth');
const { ErrorApp } = require('../middleware/errors');

const router = express.Router();
router.use(autenticar);

router.get('/estado', (req, res) => {
  res.json(jornada.obtenerEstado(req.usuario.id_usuario));
});

router.get('/metricas', (req, res) => {
  res.json(jornada.calcularMetricas(req.usuario.id_usuario, fechaConsulta(req)));
});

router.post('/marcar', (req, res) => {
  const tipo = String(req.body.tipo || '');
  res.status(201).json(jornada.marcar(req.usuario.id_usuario, tipo, req.body.duracion_break_minutos));
});

router.put('/mi-jornada', (req, res) => {
  res.json(jornada.cambiarMiJornada(req.usuario.id_usuario, req.body.horas));
});

router.post('/tiempo-muerto', (req, res) => {
  const { accion } = req.body;
  if (accion === 'inicio') {
    return res.status(201).json(jornada.abrirTiempoMuerto(req.usuario.id_usuario, req.body.minutos_inactivo));
  }
  if (accion === 'cierre') return res.json(jornada.cerrarTiempoMuerto(req.usuario.id_usuario));
  throw new ErrorApp('Acción no válida. Use "inicio" o "cierre".');
});

module.exports = router;
