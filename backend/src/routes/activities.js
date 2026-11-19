// Archivo: backend/src/routes/activities.js
// /api/actividades — tipificaciones del usuario autenticado.

const express = require('express');
const actividades = require('../services/activityService');
const { autenticar, fechaConsulta, rangoConsulta } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

router.get('/tipos', (req, res) => {
  res.json(actividades.listarTipos());
});

router.get('/', (req, res) => {
  res.json(actividades.listarDia(req.usuario.id_usuario, fechaConsulta(req)));
});

router.get('/historial', (req, res) => {
  const { desde, hasta } = rangoConsulta(req);
  res.json(actividades.historial(req.usuario.id_usuario, desde, hasta));
});

router.post('/', (req, res) => {
  res.status(201).json(actividades.crear(req.usuario.id_usuario, req.body));
});

module.exports = router;
