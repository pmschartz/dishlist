import { describe, expect, it } from 'vitest';
import { filterMeals, hasActiveFilters, NO_FILTERS, type MealFilters } from './filterMeals';
import type { Meal } from '../types';

const meal = (id: string, overrides: Partial<Meal>): Meal => ({
  id,
  restaurantName: 'Luigi’s',
  dishName: id,
  rating: 3,
  notes: '',
  imageUrl: '',
  date: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const meals: Meal[] = [
  meal('Carbonara', { date: '2026-03-01T00:00:00.000Z', rating: 5, price: 18 }),
  meal('Pad Thai', { restaurantName: 'Thai Palace', date: '2026-05-01T00:00:00.000Z', rating: 4, notes: 'Extra spicy' }),
  meal('Green Curry', { restaurantName: 'Thai Palace', date: '2026-01-15T00:00:00.000Z', rating: 5, price: 14 }),
  meal('Tacos al Pastor', { restaurantName: 'Taco Stand', date: '2026-04-01T00:00:00.000Z', rating: 2, price: 0 }),
];

const ids = (list: Meal[]) => list.map((m) => m.id);
const run = (filters: Partial<MealFilters>) => ids(filterMeals(meals, { ...NO_FILTERS, ...filters }));

describe('filterMeals', () => {
  it('returns everything newest first by default, without changing the input', () => {
    const before = ids(meals);
    expect(run({})).toEqual(['Pad Thai', 'Tacos al Pastor', 'Carbonara', 'Green Curry']);
    expect(ids(meals)).toEqual(before);
  });

  it('searches dish, restaurant and notes, ignoring case', () => {
    expect(run({ search: 'CURRY' })).toEqual(['Green Curry']);
    expect(run({ search: 'thai' })).toEqual(['Pad Thai', 'Green Curry']);
    expect(run({ search: 'spicy' })).toEqual(['Pad Thai']);
  });

  it('requires every search word to match', () => {
    expect(run({ search: 'thai green' })).toEqual(['Green Curry']);
    expect(run({ search: '  ' })).toHaveLength(4);
  });

  it('filters by exact restaurant', () => {
    expect(run({ restaurant: 'Thai Palace' })).toEqual(['Pad Thai', 'Green Curry']);
    expect(run({ restaurant: 'Thai Palace', search: 'pad' })).toEqual(['Pad Thai']);
  });

  it('sorts oldest first and by rating (ties newest first)', () => {
    expect(run({ sort: 'oldest' })).toEqual(['Green Curry', 'Carbonara', 'Tacos al Pastor', 'Pad Thai']);
    expect(run({ sort: 'rating' })).toEqual(['Carbonara', 'Green Curry', 'Pad Thai', 'Tacos al Pastor']);
  });

  it('sorts by price with unpriced meals last either way, and treats $0 as a price', () => {
    expect(run({ sort: 'price-high' })).toEqual(['Carbonara', 'Green Curry', 'Tacos al Pastor', 'Pad Thai']);
    expect(run({ sort: 'price-low' })).toEqual(['Tacos al Pastor', 'Green Curry', 'Carbonara', 'Pad Thai']);
  });
});

describe('hasActiveFilters', () => {
  it('ignores sorting and blank searches', () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...NO_FILTERS, sort: 'rating', search: '  ' })).toBe(false);
    expect(hasActiveFilters({ ...NO_FILTERS, search: 'x' })).toBe(true);
    expect(hasActiveFilters({ ...NO_FILTERS, restaurant: 'Thai Palace' })).toBe(true);
  });
});
