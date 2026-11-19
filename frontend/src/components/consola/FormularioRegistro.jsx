// Archivo: frontend/src/components/consola/FormularioRegistro.jsx
import { useState } from 'react';

const VACIO = { codigo_referencia: '', id_tipo_actividad: '', descripcion: '' };

export default function FormularioRegistro({ tipos, habilitado, motivoBloqueo, enviando, onRegistrar }) {
  const [form, setForm] = useState(VACIO);

  async function enviar(event) {
    event.preventDefault();
    const ok = await onRegistrar(form);
    if (ok) setForm(VACIO);
  }

  const bloqueado = !habilitado || enviando;
  return (
    <form className="runt-form" onSubmit={enviar} noValidate>
      <div className="mb-3">
        <label htmlFor="nroTicket">Nro Ticket</label>
        <input
          id="nroTicket"
          className="form-control"
          placeholder="Ej: INC000006253239"
          maxLength={60}
          value={form.codigo_referencia}
          onChange={(e) => setForm((f) => ({ ...f, codigo_referencia: e.target.value }))}
          disabled={bloqueado}
        />
      </div>
      <div className="mb-3">
        <label htmlFor="tipificacion">Tipificación</label>
        <select
          id="tipificacion"
          className="form-select"
          value={form.id_tipo_actividad}
          onChange={(e) => setForm((f) => ({ ...f, id_tipo_actividad: e.target.value }))}
          disabled={bloqueado}
        >
          <option value="">-- Seleccione --</option>
          {tipos.map((t) => <option key={t.id_tipo_actividad} value={t.id_tipo_actividad}>{t.nombre}</option>)}
        </select>
      </div>
      <div className="mb-3">
        <label htmlFor="observacion">Observación <span className="fw-normal text-secondary">(opcional)</span></label>
        <textarea
          id="observacion"
          className="form-control"
          rows={2}
          maxLength={1000}
          placeholder="Ej: Se escala a Funcional."
          value={form.descripcion}
          onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
          disabled={bloqueado}
        />
      </div>
      <button type="submit" className="btn btn-runt w-100" disabled={bloqueado}>
        ➜ Registrar Ticket
      </button>
      {!habilitado && motivoBloqueo && <p className="small text-secondary mt-2 mb-0">{motivoBloqueo}</p>}
    </form>
  );
}
