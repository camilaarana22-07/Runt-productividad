// Archivo: backend/src/db/seed.js
// Crea las tipificaciones base (con su tiempo estandar), los usuarios de
// demostracion y, opcionalmente, un administrador real. Es seguro ejecutarlo
// varias veces. Uso: npm run seed

const bcrypt = require('bcryptjs');
const { db } = require('./index');

// Tipificaciones reales de la operacion con su TIEMPO ESTANDAR en minutos.
// Estos valores los define la empresa mediante estudio de tiempos y son
// configurables aqui. Cambie los minutos segun corresponda.
const TIPOS_BASE = [
  { nombre: 'Acto administrativo de carga', minutos: 10 },
  { nombre: 'Acto administrativo de correccion RNA', minutos: 4 },
  { nombre: 'Acto administrativo de revocatoria RNA', minutos: 4 },
  { nombre: 'Cambio de documento', minutos: 5 },
  { nombre: 'Validacion documental', minutos: 10 },
  { nombre: 'Consulta / Soporte', minutos: 3 },
  { nombre: 'Otro', minutos: 2 },
];

const upsertTipo = db.prepare(`
  INSERT INTO tipos_actividad (nombre, minutos_estandar) VALUES (@nombre, @minutos)
  ON CONFLICT(nombre) DO UPDATE SET minutos_estandar = excluded.minutos_estandar
`);
db.transaction(() => { for (const t of TIPOS_BASE) upsertTipo.run(t); })();
console.log(`Tipificaciones cargadas: ${TIPOS_BASE.length} (con su tiempo estandar en minutos).`);

// Usuarios de demostracion (datos ficticios) para pruebas y sustentacion.
const DEMO_PASSWORD = 'DemoRunt2026*';
const DEMO = [
  { nombre: 'Operador Demo', correo: 'operador.demo@runt.demo', rol: 1, cargo: 'Operador' },
  { nombre: 'Lider Demo', correo: 'lider.demo@runt.demo', rol: 2, cargo: 'Lider de area' },
  { nombre: 'Administrador Demo', correo: 'admin.demo@runt.demo', rol: 3, cargo: 'Administrador' },
];
const existe = db.prepare('SELECT 1 FROM usuarios WHERE correo = ?');
const crear = db.prepare(`
  INSERT INTO usuarios (nombre_completo, correo, password_hash, id_rol, cargo, tiempo_jornada_horas)
  VALUES (?, ?, ?, ?, ?, 7.5)
`);
let nuevosDemo = 0;
for (const u of DEMO) {
  if (existe.get(u.correo)) continue;
  crear.run(u.nombre, u.correo, bcrypt.hashSync(DEMO_PASSWORD, 12), u.rol, u.cargo);
  nuevosDemo++;
}
if (nuevosDemo > 0) {
  console.log(`Usuarios Demo creados: ${nuevosDemo}. Contrasena para los tres: ${DEMO_PASSWORD}`);
  console.log('  operador.demo@runt.demo | lider.demo@runt.demo | admin.demo@runt.demo');
} else {
  console.log('Usuarios Demo: ya existian.');
}

// Administrador real opcional, desde variables de entorno.
const correo = (process.env.ADMIN_CORREO || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
if (!correo || password.length < 10) {
  console.log('Administrador (real) no creado: defina ADMIN_CORREO y ADMIN_PASSWORD en .env si lo necesita.');
  process.exit(0);
}
if (existe.get(correo)) {
  console.log(`El administrador ${correo} ya existe.`);
  process.exit(0);
}
crear.run(process.env.ADMIN_NOMBRE || 'Administrador RUNT', correo, bcrypt.hashSync(password, 12), 3, 'Administrador', 7.5);
console.log(`Administrador creado: ${correo}`);
