import { describe, expect, it } from 'vitest';
import { filterDishes, hasActiveFilters, NO_FILTERS, type DishFilters } from './filterDishes';
import { groupDishes } from './dishes';
import type { Meal } from '../types';

let n = 0;
const meal = (o: Partial<Meal>): Meal => ({ id: `m${n++}`, restaurantName: 'Lotus Thai Kitchen', dishName: 'Pad see ew', rating: 3, imageUrl: '', notes: '', date: '2026-11-01T00:00:00.000Z', ...o });

const dishes = groupDishes([
  meal({ dishName: 'Pad see ew', verdict: 'again', rating: 5, tweaks: [{ kind: 'remove', text: 'No onions' }], date: '2026-10-01T00:00:00.000Z' }),
  meal({ dishName: 'Green curry', verdict: 'maybe', rating: 3, notes: 'Too sweet', date: '2026-11-01T00:00:00.000Z' }),
  meal({ restaurantName: 'Bao Down', dishName: 'Pork belly bao', verdict: 'again', rating: 4, date: '2026-09-01T00:00:00.000Z' }),
  meal({ restaurantName: 'Bao Down', dishName: 'Pork belly bao', verdict: 'again', rating: 4, date: '2026-08-01T00:00:00.000Z' }),
]);

const run = (f: Partial<DishFilters>) => filterDishes(dishes, { ...NO_FILTERS, ...f }).map((d) => d.name);

describe('filterDishes', () => {
  it('shows the most recent first by default', () => {
    expect(run({})).toEqual(['Green curry', 'Pad see ew', 'Pork belly bao']);
  });

  it('searches dish, restaurant, notes and tweaks; every word must match', () => {
    expect(run({ search: 'bao' })).toEqual(['Pork belly bao']);
    expect(run({ search: 'onions' })).toEqual(['Pad see ew']);
    expect(run({ search: 'SWEET' })).toEqual(['Green curry']);
    expect(run({ search: 'lotus curry' })).toEqual(['Green curry']);
  });

  it('filters by verdict', () => {
    expect(run({ verdict: 'again' })).toEqual(['Pad see ew', 'Pork belly bao']);
    expect(run({ verdict: 'skip' })).toEqual([]);
  });

  it('sorts by rating or by times ordered', () => {
    expect(run({ sort: 'rating' })).toEqual(['Pad see ew', 'Pork belly bao', 'Green curry']);
    expect(run({ sort: 'ordered' })[0]).toBe('Pork belly bao');
  });
});

describe('hasActiveFilters', () => {
  it('ignores sorting and blank searches', () => {
    expect(hasActiveFilters({ ...NO_FILTERS, sort: 'rating', search: '  ' })).toBe(false);
    expect(hasActiveFilters({ ...NO_FILTERS, verdict: 'maybe' })).toBe(true);
    expect(hasActiveFilters({ ...NO_FILTERS, search: 'x' })).toBe(true);
  });
});
