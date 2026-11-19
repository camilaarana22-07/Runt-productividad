// Archivo: backend/src/db/seed.js
// Crea los tipos de actividad base y el administrador inicial. Es seguro ejecutarlo varias veces.
// Uso: npm run seed

const bcrypt = require('bcryptjs');
const { db } = require('./index');

// Ajuste esta lista a las tipificaciones reales de su operación.
const TIPOS_BASE = [
  'Radicación de trámite',
  'Validación documental',
  'Aprobación',
  'Devolución / Rechazo',
  'Corrección de registro',
  'Consulta / Soporte',
  'Otro',
];

const insertarTipo = db.prepare('INSERT OR IGNORE INTO tipos_actividad (nombre) VALUES (?)');
const nuevos = db.transaction(() => TIPOS_BASE.reduce((n, t) => n + insertarTipo.run(t).changes, 0))();
console.log(`Tipos de actividad: ${nuevos} nuevos (${TIPOS_BASE.length} en la lista base).`);

const correo = (process.env.ADMIN_CORREO || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
if (!correo || password.length < 10) {
  console.log('Administrador no creado: defina ADMIN_CORREO y ADMIN_PASSWORD (mín. 10 caracteres) en .env');
  process.exit(0);
}
if (db.prepare('SELECT 1 FROM usuarios WHERE correo = ?').get(correo)) {
  console.log(`El administrador ${correo} ya existe.`);
  process.exit(0);
}
db.prepare(
  `INSERT INTO usuarios (nombre_completo, correo, password_hash, id_rol, cargo)
   VALUES (?, ?, ?, 3, 'Administrador')`
).run(process.env.ADMIN_NOMBRE || 'Administrador RUNT', correo, bcrypt.hashSync(password, 12));
console.log(`Administrador creado: ${correo}`);
