// Archivo: backend/src/db/index.js
// Conexión única a SQLite (better-sqlite3) y creación del esquema.
// Todas las consultas del proyecto usan sentencias preparadas con parámetros "?":
// ningún dato del usuario se concatena dentro del SQL.

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { config } = require('../config');

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

const TIPOS_MARCACION = ['inicio_turno', 'inicio_break', 'fin_break', 'inicio_almuerzo', 'fin_almuerzo', 'fin_turno'];

db.exec(`
  CREATE TABLE IF NOT EXISTS roles (
    id_rol  INTEGER PRIMARY KEY,
    nombre  TEXT NOT NULL UNIQUE
  );
  INSERT OR IGNORE INTO roles (id_rol, nombre) VALUES
    (1, 'Operador'), (2, 'Líder de área'), (3, 'Administrador');

  CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario           INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre_completo      TEXT    NOT NULL,
    correo               TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash        TEXT    NOT NULL,
    id_rol               INTEGER NOT NULL DEFAULT 1 REFERENCES roles(id_rol),
    cargo                TEXT,
    tiempo_jornada_horas REAL    NOT NULL DEFAULT ${config.jornadaDefaultHoras},
    activo               INTEGER NOT NULL DEFAULT 1,
    creado_en            TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tipos_actividad (
    id_tipo_actividad INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre            TEXT    NOT NULL UNIQUE,
    minutos_estandar  REAL    NOT NULL DEFAULT 2,
    activo            INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS registros_actividad (
    id_registro             INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario              INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_tipo_actividad       INTEGER NOT NULL REFERENCES tipos_actividad(id_tipo_actividad),
    codigo_referencia       TEXT    NOT NULL,
    descripcion             TEXT    NOT NULL,
    tiempo_dedicado_minutos INTEGER NOT NULL DEFAULT 0,
    fecha_actividad         TEXT    NOT NULL,   -- YYYY-MM-DD (Colombia)
    hora_registro           TEXT    NOT NULL,   -- HH:MM:SS (Colombia)
    creado_en_utc           TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_reg_usuario_fecha ON registros_actividad(id_usuario, fecha_actividad);
  CREATE INDEX IF NOT EXISTS idx_reg_fecha ON registros_actividad(fecha_actividad);

  CREATE TABLE IF NOT EXISTS marcaciones (
    id_marcacion           INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario             INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    tipo                   TEXT    NOT NULL CHECK (tipo IN (${TIPOS_MARCACION.map((t) => `'${t}'`).join(',')})),
    fecha                  TEXT    NOT NULL,
    hora                   TEXT    NOT NULL,
    -- inicio_break: duración programada (15/30); fin_break / fin_almuerzo: duración real
    duracion_break_minutos REAL,
    -- solo en inicio_turno: horas de jornada vigentes ese día (el histórico no cambia si luego se edita)
    jornada_horas          REAL
  );
  CREATE INDEX IF NOT EXISTS idx_marc_usuario_fecha ON marcaciones(id_usuario, fecha);

  CREATE TABLE IF NOT EXISTS tiempos_muertos (
    id_tiempo_muerto INTEGER PRIMARY KEY AUTOINCREMENT,
    id_usuario       INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    fecha            TEXT    NOT NULL,
    hora_inicio      TEXT    NOT NULL,
    hora_fin         TEXT,               -- NULL mientras siga abierto
    duracion_minutos REAL
  );
  CREATE INDEX IF NOT EXISTS idx_tm_usuario_fecha ON tiempos_muertos(id_usuario, fecha);
`);

// Migración: tiempo estándar por tipificación
const colsTipos = new Set(db.prepare('PRAGMA table_info(tipos_actividad)').all().map((c) => c.name));
if (!colsTipos.has('minutos_estandar')) {
  db.exec('ALTER TABLE tipos_actividad ADD COLUMN minutos_estandar REAL NOT NULL DEFAULT 2');
}

// Migración: bases creadas antes de guardar la jornada por día
const columnasMarcaciones = new Set(db.prepare('PRAGMA table_info(marcaciones)').all().map((c) => c.name));
if (!columnasMarcaciones.has('jornada_horas')) {
  db.exec('ALTER TABLE marcaciones ADD COLUMN jornada_horas REAL');
}

// Si la base de datos viene de una versión anterior con otro esquema, se detiene con un
// mensaje claro en lugar de fallar más tarde con errores de SQL confusos.
const COLUMNAS_REQUERIDAS = {
  usuarios: ['id_usuario', 'nombre_completo', 'correo', 'password_hash', 'id_rol', 'tiempo_jornada_horas', 'activo'],
  registros_actividad: ['id_registro', 'id_usuario', 'id_tipo_actividad', 'codigo_referencia', 'fecha_actividad', 'hora_registro'],
  marcaciones: ['id_marcacion', 'id_usuario', 'tipo', 'fecha', 'hora', 'duracion_break_minutos'],
  tiempos_muertos: ['id_tiempo_muerto', 'id_usuario', 'fecha', 'hora_inicio', 'hora_fin'],
};
for (const [tabla, columnas] of Object.entries(COLUMNAS_REQUERIDAS)) {
  const existentes = new Set(db.prepare(`PRAGMA table_info(${tabla})`).all().map((c) => c.name));
  const faltan = columnas.filter((c) => !existentes.has(c));
  if (faltan.length) {
    throw new Error(
      `La tabla "${tabla}" de ${config.dbPath} tiene un esquema anterior (faltan: ${faltan.join(', ')}). `
      + 'Use un archivo nuevo en DB_PATH o migre los datos (ver README).'
    );
  }
}

module.exports = { db, TIPOS_MARCACION };
