import { describe, expect, it } from 'vitest';
import { parseRoute, routeHash, tabOf, type Route } from './router';

describe('router', () => {
  it('round-trips every route through its URL', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'dishes' },
      { name: 'dish', key: 'lucia’s trattoria|spicy vodka rigatoni' },
      { name: 'places' },
      { name: 'place', key: 'lotus thai kitchen' },
      { name: 'me' },
    ];
    for (const route of routes) expect(parseRoute(routeHash(route))).toEqual(route);
  });

  it('treats an empty or unknown hash as home', () => {
    expect(parseRoute('')).toEqual({ name: 'home' });
    expect(parseRoute('#/nope')).toEqual({ name: 'home' });
  });

  it('maps drill-in pages to their tab', () => {
    expect(tabOf({ name: 'dish', key: 'x' })).toBe('dishes');
    expect(tabOf({ name: 'place', key: 'x' })).toBe('places');
    expect(tabOf({ name: 'me' })).toBe('me');
  });
});
