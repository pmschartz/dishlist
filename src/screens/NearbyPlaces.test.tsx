import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../lib/placeSearch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/placeSearch')>()),
  currentLocation: vi.fn(async () => ({ lat: 44.9725, lon: -93.3686 })),
}));

import { NearbyPlaces } from './NearbyPlaces';
import { groupDishes, groupPlaces } from '../lib/dishes';
import { currentLocation } from '../lib/placeSearch';
import type { Meal } from '../types';

const meal = (id: string, restaurantName: string, place?: Meal['place']): Meal => ({
  id, restaurantName, place, dishName: 'Pancakes', rating: 4, imageUrl: '', notes: '', date: '2026-11-10T19:00:00.000Z',
});
const places = groupPlaces(groupDishes([
  meal('a', 'Perkins', { id: 'osm:W1', address: '6920 Wayzata Boulevard, Golden Valley', lat: 44.9725, lon: -93.3686 }),
  meal('b', 'Lotus', { id: 'osm:W2', lat: 44.98, lon: -93.36 }), // about 1 km away
  meal('c', 'Far Diner', { id: 'osm:W3', lat: 45.2, lon: -93.0 }), // far
  meal('d', 'No Location Cafe'),
]));

const setPermission = (state: PermissionState) =>
  Object.defineProperty(navigator, 'permissions', { configurable: true, value: { query: vi.fn(async () => ({ state })) } });

beforeEach(() => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: vi.fn() } });
});
afterEach(() => vi.clearAllMocks());

describe('NearbyPlaces', () => {
  it('lists places within about a mile, closest first, when location is allowed', async () => {
    setPermission('granted');
    const onOpenPlace = vi.fn();
    render(<NearbyPlaces places={places} onOpenPlace={onOpenPlace} />);

    expect(await screen.findByRole('heading', { name: 'Near you' })).toBeInTheDocument();
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(['Perkins', 'Lotus']);
    expect(screen.getByText(/^Here · 6920 Wayzata Boulevard/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Perkins/ }));
    expect(onOpenPlace).toHaveBeenCalledWith(expect.objectContaining({ name: 'Perkins' }));
  });

  it("asks with a button instead of prompting when location hasn't been decided", async () => {
    setPermission('prompt');
    render(<NearbyPlaces places={places} onOpenPlace={vi.fn()} />);
    const button = await screen.findByRole('button', { name: 'Show places near me' });
    expect(currentLocation).not.toHaveBeenCalled();
    await userEvent.click(button);
    expect(await screen.findByRole('heading', { name: 'Near you' })).toBeInTheDocument();
  });

  it('stays out of the way when location is blocked or nothing is near', async () => {
    setPermission('denied');
    const { container, unmount } = render(<NearbyPlaces places={places} onOpenPlace={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container).toBeEmptyDOMElement();
    unmount();

    setPermission('granted');
    vi.mocked(currentLocation).mockResolvedValueOnce({ lat: 40, lon: -100 });
    const far = render(<NearbyPlaces places={places} onOpenPlace={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(far.container).toBeEmptyDOMElement();
  });
});
