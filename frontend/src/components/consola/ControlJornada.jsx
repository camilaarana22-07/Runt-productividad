// Archivo: frontend/src/components/consola/ControlJornada.jsx
import { useEffect, useRef, useState } from 'react';

export default function ControlJornada({ permitidas, habilitado, enviando, onMarcar }) {
  const [menuBreak, setMenuBreak] = useState(false);
  const refMenu = useRef(null);
  const puede = (tipo) => habilitado && !enviando && permitidas.includes(tipo);

  useEffect(() => {
    if (!menuBreak) return undefined;
    const cerrar = (e) => { if (!refMenu.current?.contains(e.target)) setMenuBreak(false); };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, [menuBreak]);

  function breakDe(minutos) {
    setMenuBreak(false);
    onMarcar('inicio_break', minutos);
  }

  return (
    <div className="runt-jornada">
      <div className="runt-seccion mb-2">Control de Jornada</div>
      <div className="d-grid gap-2">
        <button type="button" className="btn btn-inicio" disabled={!puede('inicio_turno')} onClick={() => onMarcar('inicio_turno')}>
          INICIO TURNO
        </button>
        <div className="row g-2">
          <div className="col-6 position-relative" ref={refMenu}>
            <button
              type="button"
              className="btn w-100 dropdown-toggle"
              disabled={!puede('inicio_break')}
              aria-expanded={menuBreak}
              onClick={() => setMenuBreak((v) => !v)}
            >
              Inicio Break
            </button>
            {menuBreak && (
              <div className="runt-break-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => breakDe(15)}>⏱ 15 Minutos</button>
                <button type="button" role="menuitem" onClick={() => breakDe(30)}>⏱ 30 Minutos</button>
              </div>
            )}
          </div>
          <div className="col-6">
            <button type="button" className="btn w-100" disabled={!puede('fin_break')} onClick={() => onMarcar('fin_break')}>
              Final del Break
            </button>
          </div>
          <div className="col-6">
            <button type="button" className="btn w-100" disabled={!puede('inicio_almuerzo')} onClick={() => onMarcar('inicio_almuerzo')}>
              Inicio Almuerzo
            </button>
          </div>
          <div className="col-6">
            <button type="button" className="btn w-100" disabled={!puede('fin_almuerzo')} onClick={() => onMarcar('fin_almuerzo')}>
              Final Almuerzo
            </button>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-final"
          disabled={!puede('fin_turno')}
          onClick={() => {
            if (window.confirm('¿Finalizar el turno? Después no podrá registrar más tickets hoy.')) onMarcar('fin_turno');
          }}
        >
          FINAL TURNO
        </button>
      </div>
    </div>
  );
}
