import type { Meal } from '../types';

export type MealSort = 'newest' | 'oldest' | 'rating' | 'price-high' | 'price-low';

export const SORT_LABELS: Record<MealSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  rating: 'Highest rated',
  'price-high': 'Price: high to low',
  'price-low': 'Price: low to high',
};

export interface MealFilters {
  /** Matched against dish, restaurant and notes, ignoring case. */
  search: string;
  /** Exact restaurant name, or '' for all restaurants. */
  restaurant: string;
  sort: MealSort;
}

export const NO_FILTERS: MealFilters = { search: '', restaurant: '', sort: 'newest' };

export function hasActiveFilters(filters: MealFilters) {
  return filters.search.trim() !== '' || filters.restaurant !== '';
}

const byNewest = (a: Meal, b: Meal) => b.date.localeCompare(a.date);

const comparators: Record<MealSort, (a: Meal, b: Meal) => number> = {
  newest: byNewest,
  oldest: (a, b) => -byNewest(a, b),
  rating: (a, b) => b.rating - a.rating || byNewest(a, b),
  // Meals without a price go last in either price order.
  'price-high': (a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity) || byNewest(a, b),
  'price-low': (a, b) => (a.price ?? Infinity) - (b.price ?? Infinity) || byNewest(a, b),
};

export function filterMeals(meals: Meal[], { search, restaurant, sort }: MealFilters): Meal[] {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  return meals
    .filter((meal) => !restaurant || meal.restaurantName === restaurant)
    .filter((meal) => {
      if (words.length === 0) return true;
      const text = `${meal.dishName} ${meal.restaurantName} ${meal.notes}`.toLowerCase();
      return words.every((word) => text.includes(word));
    })
    .sort(comparators[sort]);
}
