// Archivo: frontend/src/components/InactividadAviso.jsx
// Aviso a pantalla completa cuando se detecta tiempo muerto, y resumen al regresar.

import { useEffect, useRef } from 'react';
import { formatMinutes } from '../utils/format';
import { horaCorta } from '../utils/productividad';

/**
 * aviso: null | { fase: 'detectado' | 'resumen' | 'error', minutos, desde, hasta, duracion, mensaje }
 */
export default function InactividadAviso({ aviso, onCerrar }) {
  const boton = useRef(null);

  useEffect(() => {
    if (aviso) boton.current?.focus();
  }, [aviso]);

  if (!aviso) return null;

  let titulo = 'Se detectó inactividad';
  let texto = '';
  if (aviso.fase === 'detectado') {
    texto = `No hubo gestión en los últimos ${aviso.minutos} minutos. Desde las ${horaCorta(aviso.desde)} `
      + 'este tiempo se registra como tiempo muerto y se descuenta de su tiempo laborado.';
  } else if (aviso.fase === 'resumen') {
    titulo = 'Tiempo muerto registrado';
    texto = `Se registraron ${formatMinutes(aviso.duracion)} de tiempo muerto, de ${horaCorta(aviso.desde)} `
      + `a ${horaCorta(aviso.hasta)}.`;
  } else {
    texto = aviso.mensaje;
  }

  return (
    <div className="inact-overlay" role="alertdialog" aria-modal="true" aria-labelledby="inact-titulo">
      <div className={`inact-card fase-${aviso.fase}`}>
        <h2 id="inact-titulo">{titulo}</h2>
        <p>{texto}</p>
        <button ref={boton} type="button" className="btn btn-runt w-100 mt-2" onClick={onCerrar}>
          Continuar trabajando
        </button>
      </div>
    </div>
  );
}
