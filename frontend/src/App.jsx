// Archivo: frontend/src/App.jsx
import { useAuth } from './auth/AuthContext';
import ConsolaPage from './pages/ConsolaPage';
import LoginPage from './pages/LoginPage';

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="runt-boot">RUNT 2.0</div>;
  if (!user) return <LoginPage />;
  return <ConsolaPage />;
}
