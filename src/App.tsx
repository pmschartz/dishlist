import { lazy, Suspense } from 'react';
import { LoginScreen } from './screens/LoginScreen';
import { Spinner } from './ui';
import { useAuth } from './contexts/useAuth';

// Loaded only once someone is signed in, along with Firestore and Storage, so the login
// page stays small. The service worker precaches it, so this still works offline.
const AppShell = lazy(() => import('./app/AppShell').then((m) => ({ default: m.AppShell })));

export default function App() {
  const { user, logout } = useAuth();

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <Suspense
      fallback={
        <div className="app-login">
          <Spinner size={32} label="Loading your dishlist" />
        </div>
      }
    >
      {/* Keyed by uid so a different account starts with fresh state. */}
      <AppShell key={user.uid} user={user} onLogout={logout} />
    </Suspense>
  );
}
