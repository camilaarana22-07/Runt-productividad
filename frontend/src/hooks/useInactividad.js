// Archivo: frontend/src/hooks/useInactividad.js
// Detecta 15 minutos sin gestión mientras el turno está activo.
//
// modo 'interaccion' (por defecto): mouse, clics, teclado, scroll y toques dentro de la app
//   reinician el contador. Es lo que pide el requerimiento.
// modo 'gestion': solo reinician el contador los tickets y las marcaciones (llamando a
//   registrarGestion). Úselo si el operador tramita en otra ventana (aplicativo RUNT) y
//   solo vuelve a esta pantalla para tipificar.

import { useCallback, useEffect, useRef, useState } from 'react';

const EVENTOS = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart', 'scroll'];
const REVISION_MS = 5000;

export default function useInactividad({ activo, umbralMin = 15, modo = 'interaccion', onDetectar, onRegresar }) {
  const [inactivo, setInactivo] = useState(false);
  const ultima = useRef(Date.now());
  const enInactividad = useRef(false);
  const ultimoAviso = useRef(0);
  const canal = useRef(null);
  // Callbacks en refs para no reiniciar listeners en cada render.
  const cbDetectar = useRef(onDetectar);
  const cbRegresar = useRef(onRegresar);
  cbDetectar.current = onDetectar;
  cbRegresar.current = onRegresar;

  const marcarActividad = useCallback((difundir) => {
    ultima.current = Date.now();
    if (difundir && canal.current && ultima.current - ultimoAviso.current > REVISION_MS) {
      ultimoAviso.current = ultima.current;
      canal.current.postMessage('actividad');
    }
    if (enInactividad.current) {
      enInactividad.current = false;
      setInactivo(false);
      cbRegresar.current?.();
    }
  }, []);

  /** Llamar al guardar un ticket o marcar jornada (válido en ambos modos). */
  const registrarGestion = useCallback(() => marcarActividad(true), [marcarActividad]);

  /** Si el servidor rechaza el registro, se vuelve a contar desde cero. */
  const reiniciar = useCallback(() => {
    enInactividad.current = false;
    ultima.current = Date.now();
    setInactivo(false);
  }, []);

  useEffect(() => {
    if (!activo) {
      enInactividad.current = false;
      setInactivo(false);
      return undefined;
    }

    ultima.current = Date.now();
    const umbralMs = umbralMin * 60 * 1000;

    // Varias pestañas abiertas de la app cuentan como una sola.
    if ('BroadcastChannel' in window) {
      canal.current = new BroadcastChannel('runt-actividad');
      canal.current.onmessage = () => marcarActividad(false);
    }

    const manejador = () => marcarActividad(true);
    if (modo === 'interaccion') {
      EVENTOS.forEach((e) => window.addEventListener(e, manejador, { passive: true, capture: true }));
    }

    // Se comparan marcas de tiempo porque el navegador ralentiza los timers en segundo plano.
    function revisar() {
      if (enInactividad.current) return;
      const transcurrido = Date.now() - ultima.current;
      if (transcurrido >= umbralMs) {
        enInactividad.current = true;
        setInactivo(true);
        cbDetectar.current?.(Math.floor(transcurrido / 60000));
      }
    }
    const intervalo = setInterval(revisar, REVISION_MS);
    // Al volver a la pestaña (que estuvo en segundo plano) se revisa de inmediato:
    // los navegadores frenan los timers en pestañas ocultas.
    const alVolver = () => { if (document.visibilityState === 'visible') revisar(); };
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
      if (modo === 'interaccion') {
        EVENTOS.forEach((e) => window.removeEventListener(e, manejador, { capture: true }));
      }
      canal.current?.close();
      canal.current = null;
    };
  }, [activo, umbralMin, modo, marcarActividad]);

  return { inactivo, registrarGestion, reiniciar };
}
