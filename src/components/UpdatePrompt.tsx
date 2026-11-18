import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

/**
 * Registers the service worker. Says once when the app is ready to open offline, and asks
 * before switching to a newly deployed version, so an update never reloads mid-edit.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg"
    >
      <span className="flex-1">
        {needRefresh ? 'A new version of Meal Tracker is available.' : 'Meal Tracker is ready to use offline.'}
      </span>
      {needRefresh && (
        <button
          onClick={() => updateServiceWorker(true)}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-500 px-3 py-1.5 font-medium hover:bg-indigo-400"
        >
          <RefreshCw className="h-4 w-4" />
          Reload
        </button>
      )}
      <button onClick={close} aria-label="Dismiss" className="text-gray-400 hover:text-white">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
