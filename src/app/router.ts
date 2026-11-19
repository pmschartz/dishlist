import { useSyncExternalStore } from 'react';

// Tiny hash router: every screen has a URL (so Back works and pages can be linked to), and
// hash URLs need nothing from the server or the service worker.

export type Route =
  | { name: 'home' }
  | { name: 'dishes' }
  | { name: 'dish'; key: string }
  | { name: 'places' }
  | { name: 'place'; key: string }
  | { name: 'me' };

export type Tab = 'home' | 'dishes' | 'places' | 'me';

export function parseRoute(hash: string): Route {
  const [first, second] = hash.replace(/^#\/?/, '').split('/');
  if (first === 'dishes') return second ? { name: 'dish', key: decodeURIComponent(second) } : { name: 'dishes' };
  if (first === 'places') return second ? { name: 'place', key: decodeURIComponent(second) } : { name: 'places' };
  if (first === 'me') return { name: 'me' };
  return { name: 'home' };
}

export function routeHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'dishes':
      return '#/dishes';
    case 'dish':
      return `#/dishes/${encodeURIComponent(route.key)}`;
    case 'places':
      return '#/places';
    case 'place':
      return `#/places/${encodeURIComponent(route.key)}`;
    case 'me':
      return '#/me';
  }
}

/** Which tab a route belongs to. */
export function tabOf(route: Route): Tab {
  if (route.name === 'dish' || route.name === 'dishes') return 'dishes';
  if (route.name === 'place' || route.name === 'places') return 'places';
  return route.name;
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  return parseRoute(hash);
}

export function navigate(route: Route, { replace = false } = {}) {
  const hash = routeHash(route);
  if (window.location.hash === hash) return void window.scrollTo({ top: 0 });
  if (replace) {
    // Swap the current history entry, so Back doesn't return to a page that no longer exists.
    window.history.replaceState(window.history.state, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
  window.scrollTo({ top: 0 });
}

