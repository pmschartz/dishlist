import { Button } from '../ui';
import { useAuth } from '../contexts/useAuth';
import lockup from '../design/logos/dishlist-lockup.svg';
import lockupReversed from '../design/logos/dishlist-lockup-reversed.svg';

export function LoginScreen() {
  const { signInWithGoogle } = useAuth();

  return (
    <main className="app-login">
      <h1 className="app-sr-only">Dishlist</h1>
      <div>
        <img src={lockup} alt="Dishlist" className="app-logo app-logo-light" />
        <img src={lockupReversed} alt="Dishlist" className="app-logo app-logo-reversed" />
      </div>
      <div className="app-login-copy">
        <p className="display-lg">Order it again.</p>
        <p className="body-lg dl-muted">
          Rate the dish, not the restaurant. Remember what you loved, what to skip, and exactly how you like it next time.
        </p>
      </div>
      <div className="app-stack" style={{ width: '100%', maxWidth: 320, alignItems: 'stretch' }}>
        <Button size="lg" fullWidth onClick={signInWithGoogle}>
          Continue with Google
        </Button>
        <p className="caption dl-muted">Your dishes are private to your account.</p>
      </div>
    </main>
  );
}
