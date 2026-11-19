import { useEffect, useState } from 'react';
import { Button, RestaurantCard } from '../ui';
import type { Place } from '../lib/dishes';
import { currentLocation, distanceKm, formatDistance, type LatLon } from '../lib/placeSearch';
import { formatDate } from '../lib/format';

/** How far counts as "near you": about a mile. */
const NEAR_KM = 1.6;
const MAX_SHOWN = 3;

type LocationState = { kind: 'checking' } | { kind: 'ask' } | { kind: 'locating' } | { kind: 'here'; at: LatLon } | { kind: 'off' };

/** Whether the site may already use location, without prompting. */
async function locationPermission(): Promise<PermissionState | 'unknown'> {
  try {
    return (await navigator.permissions.query({ name: 'geolocation' })).state;
  } catch {
    return 'unknown';
  }
}

/**
 * "Near you": places you've logged within about a mile, closest first, so at the restaurant
 * you can open the app and tap straight into it. Never prompts for location on its own.
 */
export function NearbyPlaces({ places, onOpenPlace }: { places: Place[]; onOpenPlace: (place: Place) => void }) {
  const located = places.filter((p) => p.place);
  const [state, setState] = useState<LocationState>({ kind: 'checking' });

  const locate = () => {
    setState({ kind: 'locating' });
    void currentLocation().then((at) => setState(at ? { kind: 'here', at } : { kind: 'off' }));
  };

  const hasLocatedPlaces = located.length > 0;
  useEffect(() => {
    if (!hasLocatedPlaces || typeof navigator === 'undefined' || !navigator.geolocation) return;
    let cancelled = false;
    void locationPermission().then((permission) => {
      if (cancelled) return;
      if (permission === 'granted') {
        void currentLocation().then((at) => !cancelled && setState(at ? { kind: 'here', at } : { kind: 'off' }));
      } else {
        setState(permission === 'denied' ? { kind: 'off' } : { kind: 'ask' });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hasLocatedPlaces]);

  if (!hasLocatedPlaces || state.kind === 'checking' || state.kind === 'off') return null;

  if (state.kind === 'ask' || state.kind === 'locating') {
    return (
      <div className="app-nearby-ask">
        <Button variant="secondary" size="sm" iconLeft="map-pin" loading={state.kind === 'locating'} onClick={locate}>
          Show places near me
        </Button>
      </div>
    );
  }

  const nearby = located
    .map((p) => ({ p, km: distanceKm(state.at, p.place!) }))
    .filter(({ km }) => km <= NEAR_KM)
    .sort((a, b) => a.km - b.km)
    .slice(0, MAX_SHOWN);
  if (!nearby.length) return null;

  return (
    <section className="app-section" aria-labelledby="nearby-heading">
      <div className="app-section-head">
        <h2 className="title-md" id="nearby-heading">
          Near you
        </h2>
      </div>
      <div className="app-stack">
        {nearby.map(({ p, km }) => (
          <RestaurantCard
            key={p.key}
            name={p.name}
            subtitle={[`${formatDistance(km)}${formatDistance(km) === 'Here' ? '' : ' away'}`, p.place?.address, `last visit ${formatDate(p.lastDate)}`]
              .filter(Boolean)
              .join(' · ')}
            visits={p.visits}
            limit={2}
            dishes={p.dishes.map((d) => ({ name: d.name, verdict: d.verdict, rating: d.rating }))}
            onClick={() => onOpenPlace(p)}
          />
        ))}
      </div>
    </section>
  );
}
