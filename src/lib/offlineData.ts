import { clearIndexedDbPersistence, terminate } from 'firebase/firestore';
import { db } from './firestore';

/** Must match the runtime cache name in vite.config.ts. */
const PHOTO_CACHE = 'meal-photos';

/**
 * Remove this account's data from the device: Firestore's offline copy of the meals
 * (including any changes not yet synced) and cached photos. Firestore can't be used
 * afterwards, so follow this with reloadApp().
 */
export async function clearOfflineData() {
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
  } catch (error) {
    // Fails if another tab still has the app open; that tab keeps the cache alive.
    console.warn('Could not clear offline meals:', error);
  }
  try {
    if ('caches' in window) await caches.delete(PHOTO_CACHE);
  } catch (error) {
    console.warn('Could not clear cached photos:', error);
  }
}

export function reloadApp() {
  window.location.reload();
}
