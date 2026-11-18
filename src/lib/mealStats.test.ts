import { describe, expect, it } from 'vitest';
import { computeStats } from './mealStats';
import type { Meal } from '../types';

// Local-time dates, so month bucketing doesn't depend on the test machine's time zone.
const at = (year: number, month: number, day = 15) => new Date(year, month - 1, day, 12).toISOString();
const NOW = new Date(2026, 10, 18, 12); // 18 Nov 2026

let nextId = 0;
const meal = (overrides: Partial<Meal>): Meal => ({
  id: `m${nextId++}`,
  restaurantName: 'Luigi’s',
  dishName: 'Carbonara',
  rating: 3,
  notes: '',
  imageUrl: '',
  date: at(2026, 11),
  ...overrides,
});

describe('computeStats', () => {
  it('handles no meals', () => {
    const stats = computeStats([], NOW);
    expect(stats).toMatchObject({ totalLogs: 0, totalDishes: 0, placeCount: 0, totalSpent: null, averageRating: null, toOrderAgain: 0, topPlaces: [], topDishes: [] });
    expect(stats.monthly).toHaveLength(12);
    expect(stats.monthly.every((m) => m.count === 0)).toBe(true);
  });

  it('counts logs and distinct dishes separately', () => {
    const stats = computeStats([meal({}), meal({}), meal({ dishName: 'Cacio e pepe' })], NOW);
    expect(stats.totalLogs).toBe(3);
    expect(stats.totalDishes).toBe(2);
    expect(stats.placeCount).toBe(1);
  });

  it('totals prices (including $0) and averages ratings, treating 0 as not rated', () => {
    const stats = computeStats([meal({ price: 20, rating: 5 }), meal({ price: 0, rating: 4 }), meal({ price: 12.5, rating: 0 }), meal({})], NOW);
    expect(stats.totalSpent).toBe(32.5);
    expect(stats.averageRating).toBe(4);
  });

  it('counts the last 12 months, oldest first, ending this month', () => {
    const stats = computeStats([meal({ date: at(2026, 11, 2) }), meal({ date: at(2026, 11, 17) }), meal({ date: at(2025, 12, 31) }), meal({ date: at(2025, 11, 30) })], NOW);
    expect(stats.monthly[0]).toMatchObject({ key: '2025-12', label: 'Dec', longLabel: 'December 2025', count: 1 });
    expect(stats.monthly[11]).toMatchObject({ key: '2026-11', label: 'Nov', count: 2 });
  });

  it('ranks places by visits with dish counts, never an averaged rating', () => {
    const stats = computeStats(
      [
        meal({ restaurantName: 'Thai Palace', dishName: 'Pad thai', verdict: 'again', price: 15, date: at(2026, 10, 1) }),
        meal({ restaurantName: 'Thai Palace', dishName: 'Curry', price: 10, date: at(2026, 10, 8) }),
        meal({ restaurantName: 'Luigi’s', dishName: 'Carbonara', date: at(2026, 9, 1) }),
      ],
      NOW,
    );
    expect(stats.topPlaces).toEqual([
      { name: 'Thai Palace', visits: 2, dishes: 2, toOrderAgain: 1, spent: 25 },
      { name: 'Luigi’s', visits: 1, dishes: 1, toOrderAgain: 0, spent: null },
    ]);
    expect(stats.topPlaces[0]).not.toHaveProperty('averageRating');
  });

  it('lists favorite dishes by their own average rating, then times ordered', () => {
    const stats = computeStats(
      [
        meal({ dishName: 'Twice five', rating: 5 }),
        meal({ dishName: 'Twice five', rating: 5 }),
        meal({ dishName: 'Once five', rating: 5 }),
        meal({ dishName: 'Four', rating: 4 }),
        meal({ dishName: 'Unrated', rating: 0 }),
      ],
      NOW,
    );
    expect(stats.topDishes.map((d) => d.name)).toEqual(['Twice five', 'Once five', 'Four']);
  });
});
