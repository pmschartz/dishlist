import { useRegisterSW } from 'virtual:pwa-register/react';
import { Toast } from '../ui';

/**
 * Registers the service worker. Says once when the app is ready to open offline, and asks
 * before switching to a newly deployed version, so an update never reloads mid-edit.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (needRefresh) {
    return (
      <div className="app-toasts">
        <Toast tone="info" icon="sparkle" actionLabel="Reload" onAction={() => updateServiceWorker(true)}>
          A new version of Dishlist is ready
        </Toast>
      </div>
    );
  }
  if (offlineReady) {
    return (
      <div className="app-toasts">
        <Toast tone="success" actionLabel="OK" onAction={() => setOfflineReady(false)}>
          Dishlist now works offline
        </Toast>
      </div>
    );
  }
  return null;
}
