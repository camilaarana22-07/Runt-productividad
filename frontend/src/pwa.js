// Archivo: frontend/src/pwa.js
// Registra el service worker y expone el evento de instalación de la PWA.

let promptDiferido = null;
const oyentes = new Set();

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();          // evita el aviso automático del navegador
    promptDiferido = e;          // lo guardamos para dispararlo desde nuestro botón
    oyentes.forEach((fn) => fn(true));
  });

  window.addEventListener('appinstalled', () => {
    promptDiferido = null;
    oyentes.forEach((fn) => fn(false));
  });
}

/** ¿Se puede instalar ahora? (hay prompt disponible y no está ya instalada) */
export function puedeInstalar() {
  const instalada = window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  return !!promptDiferido && !instalada;
}

/** Suscribe un callback que recibe true/false cuando cambia la disponibilidad. */
export function alCambiarInstalacion(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/** Lanza el cuadro de instalación del navegador. */
export async function instalar() {
  if (!promptDiferido) return false;
  promptDiferido.prompt();
  const { outcome } = await promptDiferido.userChoice;
  promptDiferido = null;
  oyentes.forEach((fn) => fn(false));
  return outcome === 'accepted';
}
