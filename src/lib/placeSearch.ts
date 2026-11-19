import type { PlaceRef } from '../types';

/** A restaurant found by the place search, ready to pick. */
export interface PlaceSuggestion {
  name: string;
  place: PlaceRef;
  /** Kilometres from where you are (or the search point), when known. */
  distanceKm?: number;
}

export interface LatLon {
  lat: number;
  lon: number;
}

// Photon is a free OpenStreetMap search by Komoot. Its public server is for light use,
// so searches are debounced, cached and only sent while online.
const PHOTON_URL = 'https://photon.komoot.io/api/';

// Places you eat at. Several osm_tag filters are combined with OR.
const FOOD_TAGS = ['restaurant', 'fast_food', 'cafe', 'bar', 'pub', 'food_court', 'ice_cream', 'biergarten'].map((v) => `amenity:${v}`);

/**
 * Round to two decimals (about 1 km), so the search service learns the neighborhood
 * you're in, not your exact spot. Plenty to rank the nearest Perkins first.
 */
export const coarse = (n: number) => Math.round(n * 100) / 100;

export function distanceKm(a: LatLon, b: LatLon): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number): string {
  const miles = km * 0.621371;
  if (miles < 0.1) return 'Here';
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    town?: string;
    village?: string;
    district?: string;
    state?: string;
  };
}

/** "6920 Wayzata Boulevard, Golden Valley". */
function shortAddress(p: NonNullable<PhotonFeature['properties']>): string | undefined {
  const street = [p.housenumber, p.street].filter(Boolean).join(' ');
  const city = p.city ?? p.town ?? p.village ?? p.district;
  const parts = [street, city].filter(Boolean);
  if (!parts.length && p.state) parts.push(p.state);
  return parts.length ? parts.join(', ') : undefined;
}

/** Turn a Photon response into suggestions, nearest first when we know where you are. */
export function parsePhoton(json: unknown, near?: LatLon): PlaceSuggestion[] {
  const features = (json as { features?: PhotonFeature[] })?.features ?? [];
  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];
  for (const f of features) {
    const p = f.properties;
    const coords = f.geometry?.coordinates;
    if (!p?.name || !p.osm_type || p.osm_id == null || !coords) continue;
    const id = `osm:${p.osm_type}${p.osm_id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const [lon, lat] = coords;
    const place: PlaceRef = { id, lat, lon, ...(shortAddress(p) ? { address: shortAddress(p) } : {}) };
    out.push({ name: p.name, place, distanceKm: near ? distanceKm(near, place) : undefined });
  }
  return near ? out.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)) : out;
}

const cache = new Map<string, PlaceSuggestion[]>();

/** Search restaurants by name, ranked by distance from `near`. Throws on network errors. */
export async function searchPlaces(query: string, near: LatLon | undefined, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  const point = near ? { lat: coarse(near.lat), lon: coarse(near.lon) } : undefined;
  const cacheKey = `${q.toLowerCase()}|${point?.lat ?? ''},${point?.lon ?? ''}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({ q, limit: '15', lang: 'en' });
  if (point) {
    params.set('lat', String(point.lat));
    params.set('lon', String(point.lon));
    // Weigh distance over how well-known a place is.
    params.set('location_bias_scale', '0.5');
    params.set('zoom', '12');
  }
  for (const tag of FOOD_TAGS) params.append('osm_tag', tag);

  const res = await fetch(`${PHOTON_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const results = parsePhoton(await res.json(), point).slice(0, 8);
  cache.set(cacheKey, results);
  return results;
}

const REVERSE_URL = 'https://photon.komoot.io/reverse';

/**
 * Restaurants right at a point (where a photo was taken), nearest first. The point is
 * rounded to about 10 m: precise enough to tell neighbors apart, not your exact spot.
 */
export async function placesAt(point: LatLon, signal?: AbortSignal, radiusKm = 0.15): Promise<PlaceSuggestion[]> {
  const at = { lat: Math.round(point.lat * 1e4) / 1e4, lon: Math.round(point.lon * 1e4) / 1e4 };
  const cacheKey = `@${at.lat},${at.lon},${radiusKm}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({ lat: String(at.lat), lon: String(at.lon), radius: String(radiusKm), limit: '6', lang: 'en' });
  for (const tag of FOOD_TAGS) params.append('osm_tag', tag);
  const res = await fetch(`${REVERSE_URL}?${params}`, { signal });
  if (!res.ok) throw new Error(`Place lookup failed (${res.status})`);
  const results = parsePhoton(await res.json(), at);
  cache.set(cacheKey, results);
  return results;
}

/**
 * The one restaurant a photo was clearly taken at: the only one close by, or one much
 * closer than the next. Undefined when it's a toss-up (a food court, a busy street).
 */
export function clearMatch<T extends { distanceKm?: number }>(candidates: T[], withinKm = 0.075): T | undefined {
  const close = candidates.filter((c) => (c.distanceKm ?? Infinity) <= withinKm);
  if (close.length === 1) return close[0];
  if (close.length > 1 && close[0].distanceKm! <= 0.04 && close[1].distanceKm! >= close[0].distanceKm! * 2) return close[0];
  return undefined;
}

/**
 * Where you are, roughly. Resolves undefined if location is unavailable or you said no;
 * a few minutes' old fix is fine for finding the nearest restaurant.
 */
export function currentLocation(timeoutMs = 8000): Promise<LatLon | undefined> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(undefined),
      { enableHighAccuracy: false, maximumAge: 5 * 60_000, timeout: timeoutMs },
    );
  });
}
