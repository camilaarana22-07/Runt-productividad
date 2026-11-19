// Archivo: frontend/src/utils/format.js
// Formatos, etiquetas y permisos. Las fechas se calculan en hora de Colombia.

const ZONA = 'America/Bogota';

/** Fecha de hoy en Colombia (YYYY-MM-DD). No usar toISOString(): devuelve UTC. */
export function todayISO() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date());
}

export function formatMinutes(min) {
  const total = Math.round(Number(min) || 0);
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Estado del backend → texto y color del distintivo del encabezado. */
export function estadoVisual(metricas) {
  const estado = metricas?.estado?.estado || 'desconectado';
  if (metricas?.inactivo_ahora) return { texto: 'Sin gestión', clase: 'estado-inactivo' };
  if (estado === 'inicio_break') {
    const ultima = (metricas.marcaciones || []).at(-1);
    const min = ultima?.duracion_break_minutos;
    return { texto: min ? `En Break (${min} min)` : 'En Break', clase: 'estado-break' };
  }
  const mapa = {
    desconectado: { texto: 'Desconectado', clase: 'estado-off' },
    inicio_turno: { texto: 'En Turno', clase: 'estado-turno' },
    fin_break: { texto: 'En Turno', clase: 'estado-turno' },
    fin_almuerzo: { texto: 'En Turno', clase: 'estado-turno' },
    inicio_almuerzo: { texto: 'En Almuerzo', clase: 'estado-almuerzo' },
    fin_turno: { texto: 'Turno Finalizado', clase: 'estado-fin' },
  };
  return mapa[estado] || mapa.desconectado;
}

export const jornadaLabel = (estado) => estadoVisual({ estado: { estado } }).texto;

const ROLES = { 1: 'Operador', 2: 'Líder de área', 3: 'Administrador' };
export const roleLabel = (idRol) => ROLES[idRol] || 'Usuario';
export const isOperador = (user) => user?.id_rol === 1;
export const canViewReports = (user) => (user?.id_rol ?? 0) >= 2;
