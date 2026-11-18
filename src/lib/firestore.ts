import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { app } from "./firebase";

// Keep a copy of the user's meals in IndexedDB so the app works offline. Changes made
// offline are queued on the device and sent when the connection returns. The
// multi-tab manager lets several open tabs share the cache.
function createFirestore(): Firestore {
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch (error) {
    // Already initialized: happens when Vite hot-reloads this module during development.
    if ((error as { code?: string }).code === "failed-precondition") return getFirestore(app);
    throw error;
  }
}

export const db = createFirestore();
