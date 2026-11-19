// Archivo: frontend/src/components/coordinacion/ModuloCoordinacion.jsx
// Pestaña "Coordinación": visor global del equipo.
// La auditoría individual se hace eligiendo al funcionario en el selector del encabezado.

import VisorGlobal from './VisorGlobal';

export default function ModuloCoordinacion({ equipo, cargando, actualizado, esHoy, onVer, onActualizar }) {
  return (
    <div>
      <p className="small text-secondary">
        Para auditar a un funcionario, elíjalo en <strong>Seleccionar funcionario</strong> (arriba) o use el botón Auditar.
      </p>
      <VisorGlobal equipo={equipo} cargando={cargando} actualizado={actualizado} esHoy={esHoy} onVer={onVer} onActualizar={onActualizar} />
    </div>
  );
}
