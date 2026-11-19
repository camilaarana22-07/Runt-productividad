// Archivo: backend/src/routes/auth.js
// /api/auth

const express = require('express');
const rateLimit = require('express-rate-limit');
const { config } = require('../config');
const authService = require('../services/authService');
const { COOKIE, autenticar } = require('../middleware/auth');
const { hoy } = require('../utils/tiempo');

const router = express.Router();

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espere 15 minutos.' },
});

const opcionesCookie = () => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: config.cookieSegura,
  path: '/',
});

router.post('/login', limiteLogin, (req, res) => {
  const { token, usuario } = authService.login(req.body.correo, req.body.password);
  res.cookie(COOKIE, token, { ...opcionesCookie(), maxAge: 12 * 60 * 60 * 1000 });
  res.json({ usuario, hoy: hoy() });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE, opcionesCookie());
  res.json({ ok: true });
});

router.get('/me', autenticar, (req, res) => {
  res.json({ usuario: req.usuario, hoy: hoy() });
});

router.put('/password', autenticar, (req, res) => {
  authService.cambiarPassword(req.usuario.id_usuario, req.body.actual, req.body.nueva);
  res.json({ ok: true, mensaje: 'Contraseña actualizada.' });
});

module.exports = router;
