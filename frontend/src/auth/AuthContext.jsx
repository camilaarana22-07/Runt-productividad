// Archivo: frontend/src/auth/AuthContext.jsx
// Sesión del usuario y función request() que usan todas las páginas.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Recupera la sesión existente (cookie) al abrir la app.
  useEffect(() => {
    apiRequest('/auth/me')
      .then((r) => setUser(r.usuario))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  // Si el servidor responde 401 (sesión vencida), se vuelve al login.
  const request = useCallback(async (path, opciones) => {
    try {
      return await apiRequest(path, opciones);
    } catch (err) {
      if (err.status === 401 && !path.startsWith('/auth/')) setUser(null);
      throw err;
    }
  }, []);

  const login = useCallback(async (correo, password) => {
    const r = await apiRequest('/auth/login', { method: 'POST', body: { correo, password } });
    setUser(r.usuario);
    return r.usuario;
  }, []);

  const logout = useCallback(async () => {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const r = await apiRequest('/auth/me');
    setUser(r.usuario);
  }, []);

  const valor = useMemo(
    () => ({ user, ready, login, logout, request, refreshUser }),
    [user, ready, login, logout, request, refreshUser]
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}
