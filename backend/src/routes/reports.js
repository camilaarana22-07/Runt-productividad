// Archivo: backend/src/routes/reports.js
// /api/reportes — solo líderes de área y administradores.

const express = require('express');
const reportes = require('../services/reportService');
const { autenticar, soloLider, fechaConsulta, rangoConsulta } = require('../middleware/auth');
const { ErrorApp } = require('../middleware/errors');

const router = express.Router();
router.use(autenticar, soloLider);

function idValido(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new ErrorApp('Funcionario no válido.');
  return id;
}

router.get('/usuarios', (req, res) => {
  res.json(reportes.listarUsuarios());
});

router.get('/jornada-usuario', (req, res) => {
  res.json(reportes.jornadaUsuario(idValido(req.query.id_usuario), fechaConsulta(req)));
});

router.get('/equipo-dia', (req, res) => {
  res.json(reportes.equipoDia(fechaConsulta(req)));
});

router.get('/equipo-mes', (req, res) => {
  const mes = String(req.query.mes || '');
  res.json(reportes.equipoMes(mes));
});

router.get('/resumen', (req, res) => {
  const { desde, hasta } = rangoConsulta(req);
  res.json(reportes.resumen(desde, hasta));
});

router.get('/detalle', (req, res) => {
  const { desde, hasta } = rangoConsulta(req);
  res.json(reportes.detalle(desde, hasta));
});

module.exports = router;
