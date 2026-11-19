// Archivo: frontend/src/components/coordinacion/VisorGlobal.jsx
// Indicadores tipo contact center y tabla del equipo en tiempo real.

import { estadoVisual, formatMinutes } from '../../utils/format';
import { horaCorta, minutosMuertos } from '../../utils/productividad';

// Categorías del visor a partir del estado del backend.
function categoria(estado) {
  if (['inicio_turno', 'fin_break', 'fin_almuerzo'].includes(estado)) return 'EN_TURNO';
  if (estado === 'inicio_break') return 'BREAK';
  if (estado === 'inicio_almuerzo') return 'ALMUERZO';
  if (estado === 'fin_turno') return 'FINALIZADO';
  return 'SIN_TURNO';
}
const ORDEN = { EN_TURNO: 0, BREAK: 1, ALMUERZO: 2, FINALIZADO: 3, SIN_TURNO: 4 };

export default function VisorGlobal({ equipo, cargando, actualizado, esHoy, onVer, onActualizar }) {
  const filas = equipo
    .map((item) => {
      const estado = item.metricas?.estado?.estado || 'desconectado';
      return {
        ...item,
        categoria: categoria(estado),
        inactivo: Boolean(item.metricas?.inactivo_ahora),
        inicio: (item.metricas?.marcaciones || []).find((m) => m.tipo === 'inicio_turno')?.hora,
        muertos: minutosMuertos(item.metricas),
      };
    })
    .sort((a, b) => (Number(b.inactivo) - Number(a.inactivo))
      || ORDEN[a.categoria] - ORDEN[b.categoria]
      || a.usuario.nombre_completo.localeCompare(b.usuario.nombre_completo, 'es'));

  const cuenta = { EN_TURNO: 0, BREAK: 0, ALMUERZO: 0, FINALIZADO: 0, SIN_TURNO: 0 };
  let inactivos = 0;
  let tickets = 0;
  let meta = 0;
  for (const f of filas) {
    cuenta[f.categoria] += 1;
    if (f.inactivo) inactivos += 1;
    tickets += f.metricas?.tickets || 0;
    meta += f.metricas?.meta_tickets || 0;
  }

  const tarjetas = [
    { texto: 'En turno', valor: cuenta.EN_TURNO, color: '#1f9d55' },
    { texto: 'Break', valor: cuenta.BREAK, color: '#e0a106' },
    { texto: 'Almuerzo', valor: cuenta.ALMUERZO, color: '#2a6f97' },
    { texto: 'Turno finalizado', valor: cuenta.FINALIZADO, color: '#dc3545' },
    { texto: 'Sin turno', valor: cuenta.SIN_TURNO, color: '#6c757d' },
    { texto: 'Sin gestión', valor: inactivos, color: '#b02a37' },
  ];

  return (
    <div>
      <div className="runt-estados-equipo">
        {tarjetas.map((t) => (
          <div key={t.texto} className="runt-estado-card" style={{ background: t.color }}>
            <span>{t.texto}</span>
            <strong>{t.valor}</strong>
          </div>
        ))}
      </div>

      {inactivos > 0 && (
        <div className="alert alert-danger py-2 mb-2">
          <strong>{inactivos}</strong> funcionario{inactivos > 1 ? 's' : ''} con tiempo muerto activo en este momento.
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <span className="small">
          Equipo: <strong>{tickets}</strong> tickets · productividad{' '}
          <strong>{meta > 0 ? Math.round((tickets / meta) * 1000) / 10 : 0}%</strong>
        </span>
        <div className="d-flex align-items-center gap-2">
          <span className="small text-secondary">
            {esHoy
              ? `Última actualización ${actualizado || '—'}${cargando ? ' · actualizando…' : ''}`
              : 'Fecha histórica'}
          </span>
          {esHoy && (
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={onActualizar} disabled={cargando}>
              {cargando ? 'Actualizando…' : '↻ Actualizar'}
            </button>
          )}
        </div>
      </div>

      <div className="runt-tabla-wrap">
        <table className="table table-sm table-hover runt-tabla">
          <thead>
            <tr>
              <th>Funcionario</th><th>Estado</th><th>Inicio</th><th>Tickets</th>
              <th>Productividad</th><th>% Tiempo</th><th>T. muerto</th><th />
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-secondary py-3">{cargando ? 'Cargando equipo…' : 'No hay operadores activos.'}</td></tr>
            ) : (
              filas.map((f) => {
                const est = estadoVisual(f.metricas);
                return (
                  <tr key={f.usuario.id_usuario} className={f.inactivo ? 'fila-muerto' : ''}>
                    <td className="fw-bold">{f.usuario.nombre_completo}</td>
                    <td>{f.error ? <span className="text-secondary">Sin datos</span> : <span className={`runt-estado ${est.clase}`}>{est.texto}</span>}</td>
                    <td>{horaCorta(f.inicio)}</td>
                    <td>{f.metricas?.tickets ?? 0}</td>
                    <td>{f.metricas?.productividad_pct ?? 0}%</td>
                    <td>{f.metricas?.tiempo_laborado_pct ?? 0}%</td>
                    <td>{formatMinutes(f.muertos)}</td>
                    <td>
                      <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => onVer(f.usuario.id_usuario)}>
                        Auditar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
