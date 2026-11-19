// Archivo: frontend/src/components/consola/CalendarioLateral.jsx
// Menú ☰: calendario anual en acordeón de meses y días.

import { useEffect, useState } from 'react';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto',
  'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const pad = (n) => String(n).padStart(2, '0');

export default function CalendarioLateral({ abierto, fecha, hoy, onElegir }) {
  const anioHoy = Number(hoy.slice(0, 4));
  const [anio, setAnio] = useState(Number(fecha.slice(0, 4)));
  const [mesAbierto, setMesAbierto] = useState(Number(fecha.slice(5, 7)) - 1);

  useEffect(() => {
    setAnio(Number(fecha.slice(0, 4)));
    setMesAbierto(Number(fecha.slice(5, 7)) - 1);
  }, [fecha]);

  return (
    <aside className={`runt-calendario ${abierto ? 'abierto' : ''}`} aria-hidden={!abierto}>
      <div className="runt-calendario-inner">
        <div className="runt-calendario-head">
          <span>📅 Calendario Anual</span>
          <div className="runt-anio">
            <button type="button" onClick={() => setAnio(anio - 1)} aria-label="Año anterior" tabIndex={abierto ? 0 : -1}>‹</button>
            <span>{anio}</span>
            <button type="button" onClick={() => setAnio(anio + 1)} disabled={anio >= anioHoy} aria-label="Año siguiente" tabIndex={abierto ? 0 : -1}>›</button>
          </div>
        </div>

        {MESES.map((nombre, m) => {
          const abiertoMes = m === mesAbierto;
          const diasMes = new Date(Date.UTC(anio, m + 1, 0)).getUTCDate();
          const desplazamiento = (new Date(Date.UTC(anio, m, 1)).getUTCDay() + 6) % 7; // lunes primero
          return (
            <div key={nombre}>
              <button
                type="button"
                className={`runt-mes ${abiertoMes ? 'abierto' : ''}`}
                onClick={() => setMesAbierto(abiertoMes ? -1 : m)}
                aria-expanded={abiertoMes}
                tabIndex={abierto ? 0 : -1}
              >
                {nombre}
                <span aria-hidden="true">{abiertoMes ? '︿' : '﹀'}</span>
              </button>
              {abiertoMes && (
                <div className="runt-dias">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <div key={`c${i}`} className="cab">{d}</div>)}
                  {Array.from({ length: desplazamiento }, (_, i) => <div key={`v${i}`} />)}
                  {Array.from({ length: diasMes }, (_, i) => {
                    const valor = `${anio}-${pad(m + 1)}-${pad(i + 1)}`;
                    const clases = ['runt-dia'];
                    if (valor === hoy) clases.push('hoy');
                    if (valor === fecha) clases.push('sel');
                    return (
                      <button
                        key={valor}
                        type="button"
                        className={clases.join(' ')}
                        disabled={valor > hoy}
                        onClick={() => onElegir(valor)}
                        aria-label={`${i + 1} de ${nombre} de ${anio}`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
