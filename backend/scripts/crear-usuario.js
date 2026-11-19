// Archivo: backend/scripts/crear-usuario.js
// Crea un usuario desde la consola del servidor.
// Uso: npm run crear-usuario -- "Nombre Completo" correo@empresa.com "Clave-Segura-123" 1 "Cargo" 7.5
//      rol: 1 = Operador, 2 = Líder de área, 3 = Administrador

const bcrypt = require('bcryptjs');
const { db } = require('../src/db');
const { config } = require('../src/config');

const [nombre, correoCrudo, password, rol = '1', cargo = '', horas = ''] = process.argv.slice(2);
const correo = String(correoCrudo || '').trim().toLowerCase();
const idRol = Number(rol);
const jornada = horas ? Number(horas) : null;

const errores = [];
if (!nombre || nombre.trim().length < 3) errores.push('nombre completo');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.push('correo válido');
if (!password || password.length < 10) errores.push('contraseña de al menos 10 caracteres');
if (![1, 2, 3].includes(idRol)) errores.push('rol 1, 2 o 3');
if (jornada !== null && !(jornada >= 1 && jornada <= 12)) errores.push('jornada entre 1 y 12 horas');
if (errores.length) {
  console.error(`Falta o no es válido: ${errores.join(', ')}.`);
  console.error('Uso: npm run crear-usuario -- "Nombre" correo@x.com "Clave-123456" 1 "Cargo" 7.5');
  process.exit(1);
}
if (db.prepare('SELECT 1 FROM usuarios WHERE correo = ?').get(correo)) {
  console.error(`Ya existe un usuario con el correo ${correo}.`);
  process.exit(1);
}

const info = db.prepare(
  `INSERT INTO usuarios (nombre_completo, correo, password_hash, id_rol, cargo, tiempo_jornada_horas)
   VALUES (?, ?, ?, ?, ?, ?)`
).run(nombre.trim(), correo, bcrypt.hashSync(password, 12), idRol, cargo || null, jornada ?? config.jornadaDefaultHoras);
console.log(`Usuario creado con id ${info.lastInsertRowid}: ${correo}`);
