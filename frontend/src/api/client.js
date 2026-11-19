// Archivo: frontend/src/api/client.js
// Cliente HTTP único. La sesión viaja en una cookie httpOnly que pone el backend,
// así que aquí no se guarda ni se maneja el token (no queda expuesto a scripts).

const BASE = '/api';

export class ApiError extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const opciones = { method, credentials: 'same-origin', headers: {} };
  if (body !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, opciones);
  } catch {
    throw new ApiError('No hay conexión con el servidor. Verifique que el backend esté encendido.', 0);
  }

  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(datos.error || `Error ${res.status}`, res.status);
  return datos;
}
