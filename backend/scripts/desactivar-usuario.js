// Archivo: backend/scripts/desactivar-usuario.js
// Desactiva un usuario por correo (no podrá entrar ni aparecer en listas; el histórico se conserva).
// Uso: npm run desactivar-usuario -- camila@runt.com

const { db } = require('../src/db');
const correo = String(process.argv[2] || '').trim().toLowerCase();
if (!correo) { console.error('Indique el correo. Ej: npm run desactivar-usuario -- camila@runt.com'); process.exit(1); }
const info = db.prepare('UPDATE usuarios SET activo = 0 WHERE correo = ?').run(correo);
console.log(info.changes ? `Usuario ${correo} desactivado.` : `No existe el usuario ${correo}.`);
