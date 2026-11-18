import { LoginPage } from './components/LoginPage';
import { MealsPage } from './components/MealsPage';
import { useAuth } from './contexts/useAuth';

export default function App() {
  const { user, logout } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  // Keyed by uid so a different account starts with fresh state.
  return <MealsPage key={user.uid} user={user} onLogout={logout} />;
}
