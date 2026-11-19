// Archivo: backend/scripts/tipos.js
// Administra las tipificaciones y su tiempo estándar en minutos.
//   npm run tipos                                         → lista con sus minutos
//   npm run tipos -- agregar "Nombre" 2                   → agrega/activa con 2 min
//   npm run tipos -- agregar "ACTO ... DE CARGA, OT" 10   → con 10 min
//   npm run tipos -- minutos "Nombre" 5                   → cambia el tiempo estándar
//   npm run tipos -- quitar "Nombre"                      → la oculta (el histórico se conserva)

const { db } = require('../src/db');

const [accion, ...args] = process.argv.slice(2);

function minutosValidos(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1440) {
    console.error(`Minutos no válidos: "${v}". Use un número entre 0 y 1440.`);
    process.exit(1);
  }
  return n;
}

if (accion === 'agregar') {
  // args: nombre1 min1 nombre2 min2 ...  (si falta el número, usa 2 por defecto)
  const insertar = db.prepare(
    `INSERT INTO tipos_actividad (nombre, minutos_estandar) VALUES (?, ?)
     ON CONFLICT(nombre) DO UPDATE SET activo = 1, minutos_estandar = excluded.minutos_estandar`
  );
  let i = 0;
  while (i < args.length) {
    const nombre = String(args[i]).trim();
    let min = 2;
    if (i + 1 < args.length && !Number.isNaN(Number(args[i + 1]))) {
      min = minutosValidos(args[i + 1]);
      i += 2;
    } else {
      i += 1;
    }
    if (nombre) { insertar.run(nombre, min); console.log(`Agregada: ${nombre} (${min} min)`); }
  }
} else if (accion === 'minutos') {
  const [nombre, valor] = args;
  const min = minutosValidos(valor);
  const r = db.prepare('UPDATE tipos_actividad SET minutos_estandar = ? WHERE nombre = ?').run(min, String(nombre).trim());
  console.log(r.changes ? `"${nombre}" → ${min} min` : `No existe: ${nombre}`);
} else if (accion === 'quitar') {
  const ocultar = db.prepare('UPDATE tipos_actividad SET activo = 0 WHERE nombre = ?');
  for (const n of args) console.log(ocultar.run(String(n).trim()).changes ? `Quitada: ${n}` : `No existe: ${n}`);
} else if (accion) {
  console.error('Acción no válida. Use: agregar | minutos | quitar');
  process.exit(1);
}

console.log('\nTipificaciones activas (minutos estándar):');
for (const t of db.prepare('SELECT nombre, minutos_estandar FROM tipos_actividad WHERE activo = 1 ORDER BY nombre').all()) {
  console.log(`  - ${t.nombre}: ${t.minutos_estandar} min`);
}
