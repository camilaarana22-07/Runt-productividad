// Archivo: frontend/src/pages/LoginPage.jsx
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function ingresar(event) {
    event.preventDefault();
    setError('');
    setEnviando(true);
    try {
      await login(correo, password);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <main className="runt-login">
      <form className="runt-login-card runt-form" onSubmit={ingresar} noValidate>
        <div className="runt-marca mb-1" style={{ color: 'var(--runt-navy)' }}>RUNT <small>2.0</small></div>
        <p className="text-secondary mb-4">Control de productividad. Ingrese con su correo.</p>
        <div className="mb-3">
          <label htmlFor="correo">Correo electrónico</label>
          <input id="correo" type="email" className="form-control" autoComplete="username" autoFocus
                 value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </div>
        <div className="mb-3">
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" className="form-control" autoComplete="current-password"
                 value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <div className="alert alert-danger py-2" role="alert">{error}</div>}
        <button type="submit" className="btn btn-runt w-100 py-2" disabled={enviando || !correo || !password}>
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="small text-secondary mt-3 mb-0">Si olvidó su contraseña, solicítela a su líder de área.</p>
      </form>
    </main>
  );
}
