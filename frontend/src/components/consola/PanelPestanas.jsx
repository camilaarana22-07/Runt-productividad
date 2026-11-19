// Archivo: frontend/src/components/consola/PanelPestanas.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatMinutes } from '../../utils/format';
import { EVENT_LABEL, horaCorta } from '../../utils/productividad';

export default function PanelPestanas({
  tickets, metricas, fecha, nombreFuncionario, esLider, exportando, onExcel, coordinacion,
}) {
  const [tab, setTab] = useState('tickets');
  const [menuExcel, setMenuExcel] = useState(false);
  const refExcel = useRef(null);

  // Cierra el menú de Excel al hacer clic afuera (sin depender del JS de Bootstrap).
  useEffect(() => {
    if (!menuExcel) return undefined;
    const cerrar = (e) => { if (!refExcel.current?.contains(e.target)) setMenuExcel(false); };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [menuExcel]);

  const elegirExcel = (modo) => { setMenuExcel(false); onExcel(modo); };

  const eventos = useMemo(() => [
    ...(metricas?.marcaciones || []).map((m) => ({
      clave: `m${m.id_marcacion}`,
      hora: m.hora,
      evento: m.tipo === 'inicio_break' && m.duracion_break_minutos
        ? `${EVENT_LABEL[m.tipo]} (${m.duracion_break_minutos} min)`
        : EVENT_LABEL[m.tipo] || m.tipo,
      detalle: (m.tipo === 'fin_break' || m.tipo === 'fin_almuerzo') && m.duracion_break_minutos != null
        ? `Duración real: ${formatMinutes(m.duracion_break_minutos)}`
        : '',
      muerto: false,
    })),
    ...(metricas?.tiempos_muertos || []).map((t) => ({
      clave: `t${t.id_tiempo_muerto}`,
      hora: t.hora_inicio,
      evento: 'Tiempo muerto / Inactividad',
      detalle: t.hora_fin
        ? `De ${horaCorta(t.hora_inicio)} a ${horaCorta(t.hora_fin)} · ${formatMinutes(t.duracion_minutos)}`
        : `Desde ${horaCorta(t.hora_inicio)} · en curso (${formatMinutes(t.duracion_minutos)})`,
      muerto: true,
    })),
  ].sort((a, b) => String(a.hora).localeCompare(String(b.hora))), [metricas]);

  const pestanas = [
    { id: 'tickets', texto: '📋 Tickets Registrados' },
    { id: 'hora', texto: '📊 Atendidos por Hora' },
    { id: 'eventos', texto: '⏱️ Eventos de Jornada' },
    ...(esLider ? [{ id: 'coord', texto: '👁️ Coordinación' }] : []),
  ];

  return (
    <div className="runt-card runt-card-body" style={{ borderTop: '3px solid var(--runt-navy)' }}>
      <div className="runt-tabs">
        {pestanas.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`runt-tab ${tab === p.id ? 'activa' : ''}`}
            aria-pressed={tab === p.id}
            onClick={() => setTab(p.id)}
          >
            {p.texto}
          </button>
        ))}
        {esLider && (
          <div className="runt-excel ms-auto" ref={refExcel}>
            <button type="button" className="btn btn-success btn-sm fw-bold"
                    disabled={exportando} aria-expanded={menuExcel}
                    onClick={() => setMenuExcel((v) => !v)}>
              📗 {exportando ? 'Generando…' : 'Descargar Excel ▾'}
            </button>
            {menuExcel && (
              <div className="runt-excel-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => elegirExcel('dia')}>
                  Del día ({fecha})
                </button>
                <button type="button" role="menuitem" onClick={() => elegirExcel('mes')}>
                  Del mes ({fecha.slice(0, 7)})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {tab === 'tickets' && (
        <div className="runt-tabla-wrap">
          <table className="table table-sm table-striped runt-tabla">
            <thead>
              <tr><th>Nro Ticket</th><th>Tipificación</th><th>Fecha y Hora</th><th>Observación</th><th>Funcionario</th></tr>
            </thead>
            <tbody>
              {tickets.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-secondary py-3">No hay tickets registrados en esta fecha</td></tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t.id_registro}>
                    <td className="fw-bold">{t.codigo_referencia}</td>
                    <td>{t.tipo}</td>
                    <td>{fecha} {t.hora_registro}</td>
                    <td>{t.descripcion}</td>
                    <td>{nombreFuncionario}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'hora' && (
        <>
          {(metricas?.por_hora || []).length === 0 && (
            <p className="text-secondary mb-3">Aún no hay turno iniciado en esta fecha.</p>
          )}
          <div className="runt-tabla-wrap mb-3">
            <table className="table table-sm table-bordered runt-tabla mb-0" style={{ maxWidth: 360 }}>
              <thead>
                <tr><th>Rango de hora</th><th className="text-end">Ticket por hora</th></tr>
              </thead>
              <tbody>
                {(metricas?.por_hora || []).map((h) => (
                  <tr key={h.hora}>
                    <td>{h.hora}</td>
                    <td className="text-end">{h.total}</td>
                  </tr>
                ))}
                <tr className="fw-bold table-light">
                  <td>Total general</td>
                  <td className="text-end">
                    {(metricas?.por_hora || []).reduce((s, h) => s + h.total, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'eventos' && (
        <div className="runt-tabla-wrap">
          <table className="table table-sm runt-tabla">
            <thead><tr><th>Hora</th><th>Evento</th><th>Detalle</th></tr></thead>
            <tbody>
              {eventos.length === 0 ? (
                <tr><td colSpan={3} className="text-center text-secondary py-3">Sin marcaciones en esta fecha</td></tr>
              ) : (
                eventos.map((e) => (
                  <tr key={e.clave} className={e.muerto ? 'fila-muerto' : ''}>
                    <td>{e.hora}</td>
                    <td className="fw-bold">{e.evento}</td>
                    <td>{e.detalle}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'coord' && coordinacion}
    </div>
  );
}
