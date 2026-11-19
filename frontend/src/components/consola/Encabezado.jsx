// Archivo: frontend/src/components/consola/Encabezado.jsx
import { useEffect, useState } from 'react';
import { estadoVisual } from '../../utils/format';
import { alCambiarInstalacion, instalar, puedeInstalar } from '../../pwa';

export default function Encabezado({
  onMenu, usuarios, idSeleccionado, onSeleccionar, puedeElegir, fecha, metricas, usuarioSesion, onSalir,
}) {
  const estado = estadoVisual(metricas);
  // Botón de instalar la app: solo para la coordinación (puedeElegir = líder/admin).
  const [instalable, setInstalable] = useState(puedeInstalar());
  useEffect(() => alCambiarInstalacion((disp) => setInstalable(disp)), []);
  async function instalarApp() { await instalar(); setInstalable(puedeInstalar()); }
  return (
    <header className="runt-header">
      <div className="d-flex align-items-center gap-3">
        <button type="button" className="runt-menu" onClick={onMenu} aria-label="Abrir calendario">☰</button>
        <div className="runt-marca">RUNT <small>2.0</small></div>
      </div>

      <div className="runt-selector">
        <label htmlFor="selFuncionario">Seleccionar funcionario:</label>
        <select
          id="selFuncionario"
          className="form-select form-select-sm"
          value={idSeleccionado}
          onChange={(e) => onSeleccionar(Number(e.target.value))}
          disabled={!puedeElegir}
        >
          {usuarios.map((u) => (
            <option key={u.id_usuario} value={u.id_usuario}>
              {u.nombre_completo}{u.id_usuario === usuarioSesion.id_usuario ? ' (usted)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="runt-header-derecha">
        <span className="runt-dia-badge">Día: {fecha}</span>
        <span className={`runt-estado ${estado.clase}`} aria-live="polite">{estado.texto}</span>
        {puedeElegir && instalable && (
          <button type="button" className="runt-sesion" onClick={instalarApp} title="Instalar la app en este dispositivo">
            📲 Instalar app
          </button>
        )}
        <button type="button" className="runt-sesion" onClick={onSalir} title={usuarioSesion.correo}>
          Salir
        </button>
      </div>
    </header>
  );
}
