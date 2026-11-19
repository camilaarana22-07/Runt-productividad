# RUNT Productividad v2

Frontend React + Vite y API Node.js + Express + SQLite (better-sqlite3), con JWT, validación estricta
de jornada, detector de tiempo muerto y hora de Colombia en todos los registros.

## Estructura

```
proyecto-runt/
├── README.md
├── backend/
│   ├── package.json
│   ├── .env.example            → copiar como .env
│   ├── .gitignore
│   ├── data/                   → aquí vive runt.db (no se sube a git)
│   ├── scripts/
│   │   ├── crear-usuario.js    → alta de usuarios desde la consola
│   │   └── tipos.js            → agregar o quitar tipificaciones
│   └── src/
│       ├── index.js            → arranque
│       ├── app.js              → Express, seguridad, rutas /api y frontend compilado
│       ├── config.js           → variables de entorno validadas
│       ├── db/
│       │   ├── index.js        → conexión, esquema y verificación de columnas
│       │   └── seed.js         → tipificaciones base y administrador inicial
│       ├── middleware/
│       │   ├── auth.js         → JWT (cookie httpOnly), roles, validación de fechas
│       │   └── errors.js
│       ├── routes/
│       │   ├── auth.js         → /api/auth
│       │   ├── jornada.js      → /api/jornada
│       │   ├── activities.js   → /api/actividades
│       │   └── reports.js      → /api/reportes
│       ├── services/
│       │   ├── authService.js
│       │   ├── jornadaService.js
│       │   ├── activityService.js
│       │   └── reportService.js
│       └── utils/
│           └── tiempo.js       → fecha y hora de Colombia (UTC−5)
└── frontend/
    ├── package.json · index.html
    ├── vite.config.js          → proxy /api → backend en desarrollo
    └── src/
        ├── main.jsx · App.jsx
        ├── api/client.js
        ├── auth/AuthContext.jsx
        ├── pages/              → LoginPage, ConsolaPage (consola única)
        ├── components/
        │   ├── consola/        → Encabezado, CalendarioLateral, FormularioRegistro,
        │   │                     ControlJornada, MiJornada, TarjetasKpi, PanelPestanas, GraficaHoras
        │   ├── coordinacion/   → ModuloCoordinacion, VisorGlobal
        │   └── InactividadAviso.jsx
        ├── hooks/useInactividad.js
        ├── styles/consola.css  → diseño RUNT 2.0 sobre Bootstrap 5
        └── utils/              → format, excel, equipo, productividad, alerta
```

## Puesta en marcha (desarrollo)

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env          # complete JWT_SECRET, ADMIN_CORREO y ADMIN_PASSWORD
npm run seed                  # tipificaciones base + administrador
npm run dev                   # http://localhost:3000

# 2. Frontend (otra terminal)
cd frontend
npm install

npm run dev                   # http://localhost:5173
```

Crear operadores y líderes:

```bash
cd backend
npm run crear-usuario -- "Ana Ruiz" ana.ruiz@empresa.com "Clave-Inicial-2026" 1 "Operadora RUNT" 7.5
# rol: 1 Operador · 2 Líder de área · 3 Administrador
```

Tipificaciones:

```bash
npm run tipos                                   # ver la lista
npm run tipos -- agregar "Incidencia" "ACTO ADMINISTRATIVO DE CARGA, OT"
npm run tipos -- quitar "Otro"
```

## Producción

`cd frontend && npm run build` genera `frontend/dist`; el backend lo sirve automáticamente.
Con HTTPS delante (Nginx/IIS): `NODE_ENV=production`, `COOKIE_SECURE=true`, `TRUST_PROXY=1`.
Respalde `backend/data/runt.db` junto con `runt.db-wal` a diario.

## Base de datos anterior

Si `DB_PATH` apunta a un `runt.db` creado por otra versión, el servidor se detiene indicando
qué columnas faltan. Opciones: usar un archivo nuevo (`DB_PATH=./data/runt_v2.db`) o migrar
los datos con un script SQL (los nombres de tablas y columnas están en `src/db/index.js`).

## Archivos antiguos que se reemplazan

`index.js`, `database.js`, `turnos.js` y `actividades.js` de la versión anterior ya no se usan.
Muévalos fuera del proyecto: tenían tablas incompatibles entre sí y los problemas de abajo.

## Correcciones de seguridad y datos

| Problema anterior | Solución |
|---|---|
| Inyección SQL: `UPDATE turnos SET ${tipo}` con dato del usuario | Todas las consultas son sentencias preparadas con `?`; el tipo de marcación se valida contra una lista cerrada y la tabla tiene `CHECK` |
| Endpoints sin sesión que confiaban en `nombre_funcionario` del navegador | Toda ruta exige JWT; el usuario sale del token, nunca del cuerpo de la petición |
| Clave JWT escrita en el código | `JWT_SECRET` en `.env`, mínimo 32 caracteres, el servidor no arranca sin ella |
| Token accesible desde JavaScript | Cookie `httpOnly` + `SameSite=Strict`; expira en 12 h |
| `toISOString()` (UTC): después de las 7 p. m. guardaba el día siguiente | Fecha y hora calculadas en `America/Bogota`, en backend y frontend |
| Fecha y hora enviadas por el navegador | El servidor ignora la fecha del cliente y usa su propio reloj |
| Contraseñas | bcrypt (12 rondas), límite de 10 intentos de login cada 15 min, respuesta uniforme ante correo inexistente |
| Errores internos visibles | El navegador solo recibe mensajes genéricos; el detalle queda en el log del servidor |

## Reglas de cálculo

| Indicador | Fórmula |
|---|---|
| Pausas | break real + almuerzo real (de las marcaciones) |
| Meta ajustada | (jornada − pausas / 60) × 6 tickets/hora |
| Tiempo efectivo | tiempo en turno − pausas − tiempo muerto |
| % tiempo laborado | tiempo efectivo / (jornada − pausas); avanza de 0 % a 100 % durante el día |
| % productividad | tickets / meta ajustada |

## API

| Método | Ruta | Acceso |
|---|---|---|
| POST | /api/auth/login · /api/auth/logout | público |
| GET · PUT | /api/auth/me · /api/auth/password | autenticado |
| GET | /api/jornada/estado · /api/jornada/metricas?fecha= | autenticado |
| POST | /api/jornada/marcar · /api/jornada/tiempo-muerto | autenticado |
| PUT | /api/jornada/mi-jornada (cada funcionario ajusta sus horas; aplica desde hoy) | autenticado |
| GET · POST | /api/actividades/tipos · /api/actividades?fecha= · /api/actividades/historial · POST /api/actividades | autenticado |
| GET | /api/reportes/usuarios · jornada-usuario · equipo-dia · resumen · detalle | líder / admin |
