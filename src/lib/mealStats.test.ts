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
    expect(stats).toMatchObject({
      totalMeals: 0,
      restaurantCount: 0,
      totalSpent: null,
      averageRating: null,
      topRestaurants: [],
      topDishes: [],
    });
    expect(stats.monthly).toHaveLength(12);
    expect(stats.monthly.every((m) => m.count === 0)).toBe(true);
  });

  it('totals prices (including $0) and ignores unpriced meals', () => {
    const stats = computeStats([meal({ price: 20 }), meal({ price: 0 }), meal({ price: 12.5 }), meal({})], NOW);
    expect(stats.totalSpent).toBe(32.5);
  });

  it('averages ratings, treating 0 as not rated', () => {
    const stats = computeStats([meal({ rating: 5 }), meal({ rating: 4 }), meal({ rating: 0 })], NOW);
    expect(stats.averageRating).toBe(4.5);
    expect(computeStats([meal({ rating: 0 })], NOW).averageRating).toBeNull();
  });

  it('counts the last 12 months, oldest first, ending this month', () => {
    const stats = computeStats(
      [
        meal({ date: at(2026, 11, 2) }),
        meal({ date: at(2026, 11, 17) }),
        meal({ date: at(2025, 12, 31) }),
        meal({ date: at(2025, 11, 30) }), // 13 months ago: outside the window
      ],
      NOW,
    );
    expect(stats.monthly.map((m) => m.key)).toEqual([
      '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05',
      '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11',
    ]);
    expect(stats.monthly[0]).toMatchObject({ label: 'Dec', longLabel: 'December 2025', count: 1 });
    expect(stats.monthly[11]).toMatchObject({ label: 'Nov', count: 2 });
    expect(stats.totalMeals).toBe(4);
  });

  it('ranks restaurants by visits, then average rating', () => {
    const stats = computeStats(
      [
        meal({ restaurantName: 'Thai Palace', rating: 4, price: 15 }),
        meal({ restaurantName: 'Thai Palace', rating: 2, price: 10 }),
        meal({ restaurantName: 'Thai Palace', rating: 0 }),
        meal({ restaurantName: 'Luigi’s', rating: 5 }),
        meal({ restaurantName: 'Taco Stand', rating: 3 }),
      ],
      NOW,
    );
    expect(stats.restaurantCount).toBe(3);
    expect(stats.topRestaurants).toEqual([
      { name: 'Thai Palace', visits: 3, averageRating: 3, spent: 25 },
      { name: 'Luigi’s', visits: 1, averageRating: 5, spent: null },
      { name: 'Taco Stand', visits: 1, averageRating: 3, spent: null },
    ]);
  });

  it('keeps at most 5 restaurants and 5 dishes', () => {
    const meals = Array.from({ length: 8 }, (_, i) => meal({ restaurantName: `Place ${i}`, rating: 4 }));
    const stats = computeStats(meals, NOW);
    expect(stats.topRestaurants).toHaveLength(5);
    expect(stats.topDishes).toHaveLength(5);
  });

  it('lists top dishes by rating, newest first on ties, skipping unrated', () => {
    const stats = computeStats(
      [
        meal({ dishName: 'Older five', rating: 5, date: at(2026, 3) }),
        meal({ dishName: 'Four', rating: 4, date: at(2026, 10) }),
        meal({ dishName: 'Newer five', rating: 5, date: at(2026, 9) }),
        meal({ dishName: 'Unrated', rating: 0, date: at(2026, 11) }),
      ],
      NOW,
    );
    expect(stats.topDishes.map((m) => m.dishName)).toEqual(['Newer five', 'Older five', 'Four']);
  });
});
