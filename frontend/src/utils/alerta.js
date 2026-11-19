// Archivo: frontend/src/utils/alerta.js
// Alerta sonora sin archivos externos (Web Audio) y parpadeo del título de la pestaña.

let ctx = null;

// Los navegadores exigen un gesto del usuario antes de permitir audio.
if (typeof window !== 'undefined') {
  const desbloquear = () => {
    if (!ctx && window.AudioContext) ctx = new AudioContext();
  };
  window.addEventListener('click', desbloquear, { once: true });
  window.addEventListener('keydown', desbloquear, { once: true });
}

export function sonarAlerta() {
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const t0 = ctx.currentTime;
  [0, 0.35, 0.7].forEach((retardo) => {
    const osc = ctx.createOscillator();
    const gan = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 880;
    gan.gain.setValueAtTime(0.0001, t0 + retardo);
    gan.gain.exponentialRampToValueAtTime(0.25, t0 + retardo + 0.02);
    gan.gain.exponentialRampToValueAtTime(0.0001, t0 + retardo + 0.25);
    osc.connect(gan).connect(ctx.destination);
    osc.start(t0 + retardo);
    osc.stop(t0 + retardo + 0.3);
  });
}

let parpadeo = null;
let tituloOriginal = typeof document !== 'undefined' ? document.title : '';

export function iniciarParpadeo(texto = '⚠ Inactividad detectada') {
  detenerParpadeo();
  tituloOriginal = document.title;
  let alterno = false;
  parpadeo = setInterval(() => {
    alterno = !alterno;
    document.title = alterno ? texto : tituloOriginal;
  }, 1000);
}

export function detenerParpadeo() {
  if (!parpadeo) return;
  clearInterval(parpadeo);
  parpadeo = null;
  document.title = tituloOriginal;
}
