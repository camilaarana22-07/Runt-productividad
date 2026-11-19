// Archivo: frontend/src/components/consola/MiJornada.jsx
// Cada funcionario ajusta sus propias horas de jornada. Aplica desde hoy.

import { useEffect, useState } from 'react';

export default function MiJornada({ horasActuales, habilitado, onGuardar }) {
  const [horas, setHoras] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (horasActuales != null) setHoras(String(horasActuales));
  }, [horasActuales]);

  const valida = Number(horas) >= 1 && Number(horas) <= 12;
  const cambio = horasActuales != null && String(horasActuales) !== String(horas);

  async function guardar(event) {
    event.preventDefault();
    if (!valida || !cambio) return;
    setGuardando(true);
    await onGuardar(Number(horas));
    setGuardando(false);
  }

  return (
    <form className="runt-form mt-4" onSubmit={guardar}>
      <div className="runt-seccion mb-2">Mi jornada</div>
      <label htmlFor="misHoras" className="fw-normal small text-secondary">Horas totales de jornada</label>
      <div className="input-group input-group-sm">
        <input
          id="misHoras"
          type="number"
          className="form-control"
          min="1"
          max="12"
          step="0.25"
          value={horas}
          onChange={(e) => setHoras(e.target.value)}
          disabled={!habilitado || guardando}
        />
        <span className="input-group-text">horas</span>
        <button type="submit" className="btn btn-runt" disabled={!habilitado || guardando || !valida || !cambio}>
          Guardar
        </button>
      </div>
      <p className="small text-secondary mt-1 mb-0">
        {valida ? 'Aplica desde hoy; los días anteriores no cambian.' : 'Escriba un valor entre 1 y 12 horas.'}
      </p>
    </form>
  );
}
