// Archivo: frontend/src/utils/productividad.js
// Reglas compartidas por el escritorio del operador y el módulo de coordinación.
// El backend es la fuente oficial de los KPIs; estas funciones sirven para vista previa,
// agrupación de estados y formatos.

export const UMBRAL_INACTIVIDAD_MIN = 15;

export const EVENT_LABEL = {
  inicio_turno: 'Inicio turno',
  fin_turno: 'Final turno',
  inicio_break: 'Inicio break',
  fin_break: 'Final break',
  inicio_almuerzo: 'Inicio almuerzo',
  fin_almuerzo: 'Final almuerzo',
};

/** Agrupa el estado del backend en las 4 categorías del visor tipo contact center. */
export function categoriaEstado(estado) {
  if (['inicio_turno', 'fin_break', 'fin_almuerzo'].includes(estado)) return 'EN_TURNO';
  if (estado === 'inicio_break') return 'BREAK';
  if (estado === 'inicio_almuerzo') return 'ALMUERZO';
  return 'OFFLINE'; // desconectado o fin_turno
}

export function minutosMuertos(metricas) {
  if (metricas?.tiempo?.minutos_muertos != null) return metricas.tiempo.minutos_muertos;
  return (metricas?.tiempos_muertos || []).reduce((s, t) => s + (Number(t.duracion_minutos) || 0), 0);
}

export function formatReloj(totalMin) {
  const mins = Math.max(0, Math.round(Number(totalMin) || 0));
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`;
}

export function horaCorta(hora) {
  return hora ? String(hora).slice(0, 5) : '—';
}
