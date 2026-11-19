import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearMatch, coarse, formatDistance, parsePhoton, placesAt, searchPlaces } from './placeSearch';

const feature = (id: number, name: string, lon: number, lat: number, extra: Record<string, unknown> = {}) => ({
  geometry: { coordinates: [lon, lat] },
  properties: { osm_type: 'W', osm_id: id, name, ...extra },
});

describe('parsePhoton', () => {
  const json = {
    features: [
      feature(1, 'Perkins', -93.42, 44.93, { street: 'Minnesota State Highway 7', city: 'Hopkins' }),
      feature(2, 'Perkins', -93.37, 44.97, { housenumber: '6920', street: 'Wayzata Boulevard', city: 'Golden Valley' }),
      feature(2, 'Perkins', -93.37, 44.97),
      { geometry: { coordinates: [0, 0] }, properties: { osm_type: 'N', osm_id: 3 } },
    ],
  };

  it('builds a place for each named result, without duplicates', () => {
    const results = parsePhoton(json);
    expect(results.map((r) => r.place.id)).toEqual(['osm:W1', 'osm:W2']);
    expect(results[1].place).toEqual({ id: 'osm:W2', lat: 44.97, lon: -93.37, address: '6920 Wayzata Boulevard, Golden Valley' });
  });

  it('puts the nearest first when it knows where you are', () => {
    const results = parsePhoton(json, { lat: 44.98, lon: -93.27 });
    expect(results.map((r) => r.place.id)).toEqual(['osm:W2', 'osm:W1']);
    expect(results[0].distanceKm).toBeGreaterThan(7);
    expect(results[0].distanceKm).toBeLessThan(9);
  });

  it('copes with an empty or odd response', () => {
    expect(parsePhoton({})).toEqual([]);
    expect(parsePhoton(null)).toEqual([]);
  });
});

describe('searchPlaces', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends only a rough location and asks for places to eat', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) });
    vi.stubGlobal('fetch', fetchMock);
    await searchPlaces('Perkins', { lat: 44.981234, lon: -93.271234 });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('q')).toBe('Perkins');
    expect(url.searchParams.get('lat')).toBe('44.98');
    expect(url.searchParams.get('lon')).toBe('-93.27');
    expect(url.searchParams.getAll('osm_tag')).toContain('amenity:restaurant');
  });

  it('throws when the service fails, so the field can fall back to typing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(searchPlaces('Nowhere', undefined)).rejects.toThrow('503');
  });
});

describe('clearMatch', () => {
  const at = (km: number) => ({ distanceKm: km });
  it('picks the only restaurant close by, or one much closer than the next', () => {
    expect(clearMatch([at(0.05), at(0.2)])).toEqual(at(0.05));
    expect(clearMatch([at(0.01), at(0.06)])).toEqual(at(0.01));
  });
  it("gives up when it's a toss-up or nothing is close", () => {
    expect(clearMatch([at(0.03), at(0.04)])).toBeUndefined();
    expect(clearMatch([at(0.1)])).toBeUndefined();
    expect(clearMatch([])).toBeUndefined();
  });
});

describe('placesAt', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('looks up restaurants at a point rounded to about 10 m', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) });
    vi.stubGlobal('fetch', fetchMock);
    await placesAt({ lat: 44.972481, lon: -93.368591 });
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe('/reverse');
    expect(url.searchParams.get('lat')).toBe('44.9725');
    expect(url.searchParams.get('lon')).toBe('-93.3686');
  });
});

describe('helpers', () => {
  it('rounds coordinates to about a kilometre', () => {
    expect(coarse(44.98765)).toBe(44.99);
  });
  it('shows distance in miles', () => {
    expect(formatDistance(0.05)).toBe('Here');
    expect(formatDistance(3.2)).toBe('2.0 mi');
    expect(formatDistance(40)).toBe('25 mi');
  });
});
