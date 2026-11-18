import type { Dish } from './dishes';
import type { Verdict } from '../types';

export type DishSort = 'recent' | 'rating' | 'ordered';

export const SORT_OPTIONS: { value: DishSort; label: string }[] = [
  { value: 'recent', label: 'Recent' },
  { value: 'rating', label: 'Top rated' },
  { value: 'ordered', label: 'Most ordered' },
];

export interface DishFilters {
  /** Matched against dish, restaurant, notes and tweaks, ignoring case; every word must match. */
  search: string;
  /** Only dishes with this verdict, or null for all. */
  verdict: Verdict | null;
  sort: DishSort;
}

export const NO_FILTERS: DishFilters = { search: '', verdict: null, sort: 'recent' };

export function hasActiveFilters({ search, verdict }: DishFilters) {
  return search.trim() !== '' || verdict !== null;
}

const comparators: Record<DishSort, (a: Dish, b: Dish) => number> = {
  recent: (a, b) => b.lastDate.localeCompare(a.lastDate),
  rating: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.lastDate.localeCompare(a.lastDate),
  ordered: (a, b) => b.timesOrdered - a.timesOrdered || b.lastDate.localeCompare(a.lastDate),
};

export function filterDishes(dishes: Dish[], { search, verdict, sort }: DishFilters): Dish[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  return dishes
    .filter((d) => verdict === null || d.verdict === verdict)
    .filter((d) => {
      if (!words.length) return true;
      const text = [d.name, d.restaurant, ...d.logs.map((m) => m.notes), ...d.tweaks.map((t) => t.text)]
        .join(' ')
        .toLowerCase();
      return words.every((w) => text.includes(w));
    })
    .sort(comparators[sort]);
}
