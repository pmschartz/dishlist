import { lazy, Suspense } from 'react';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './contexts/useAuth';

// Loaded only once someone is signed in, along with Firestore and Storage, so the login
// page stays small. The service worker precaches it, so this still works offline.
const MealsPage = lazy(() => import('./components/MealsPage').then((m) => ({ default: m.MealsPage })));

export default function App() {
  const { user, logout } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Suspense
      fallback={
        <p className="min-h-screen bg-gray-50 pt-24 text-center text-gray-500" aria-live="polite">
          Loading…
        </p>
      }
    >
      {/* Keyed by uid so a different account starts with fresh state. */}
      <MealsPage key={user.uid} user={user} onLogout={logout} />
    </Suspense>
  );
}
