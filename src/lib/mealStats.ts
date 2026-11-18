import type { Meal } from '../types';

export interface MonthCount {
  /** e.g. "2026-11" */
  key: string;
  /** e.g. "Nov" */
  label: string;
  /** e.g. "November 2026" */
  longLabel: string;
  count: number;
}

export interface RestaurantStats {
  name: string;
  visits: number;
  /** Average of rated meals (rating > 0), or null if none are rated. */
  averageRating: number | null;
  /** Total of priced meals, or null if none have a price. */
  spent: number | null;
}

export interface MealStats {
  totalMeals: number;
  restaurantCount: number;
  /** Sum of all prices, or null if no meal has a price. */
  totalSpent: number | null;
  /** Average over rated meals (a rating of 0 means "not rated"), or null. */
  averageRating: number | null;
  /** The last 12 months, oldest first, ending with the month of `now`. */
  monthly: MonthCount[];
  /** Most-visited first (ties: higher average rating, then name). At most 5. */
  topRestaurants: RestaurantStats[];
  /** Highest rated first (ties: newest). At most 5, rated meals only. */
  topDishes: Meal[];
}

const TOP_N = 5;

function average(values: number[]) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

function sumOrNull(values: number[]) {
  return values.length ? values.reduce((sum, v) => sum + v, 0) : null;
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function computeStats(meals: Meal[], now = new Date()): MealStats {
  const prices = meals.flatMap((m) => (m.price != null ? [m.price] : []));
  const ratings = meals.flatMap((m) => (m.rating > 0 ? [m.rating] : []));

  // Months are bucketed in local time, matching the dates shown on the cards.
  const monthly: MonthCount[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthly.push({
      key: monthKey(d),
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      longLabel: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      count: 0,
    });
  }
  const byMonth = new Map(monthly.map((m) => [m.key, m]));
  for (const meal of meals) {
    const bucket = byMonth.get(monthKey(new Date(meal.date)));
    if (bucket) bucket.count++;
  }

  const byRestaurant = new Map<string, Meal[]>();
  for (const meal of meals) {
    byRestaurant.set(meal.restaurantName, [...(byRestaurant.get(meal.restaurantName) ?? []), meal]);
  }
  const topRestaurants = [...byRestaurant.entries()]
    .map(([name, visits]) => ({
      name,
      visits: visits.length,
      averageRating: average(visits.flatMap((m) => (m.rating > 0 ? [m.rating] : []))),
      spent: sumOrNull(visits.flatMap((m) => (m.price != null ? [m.price] : []))),
    }))
    .sort(
      (a, b) =>
        b.visits - a.visits || (b.averageRating ?? 0) - (a.averageRating ?? 0) || a.name.localeCompare(b.name),
    )
    .slice(0, TOP_N);

  const topDishes = meals
    .filter((m) => m.rating > 0)
    .sort((a, b) => b.rating - a.rating || b.date.localeCompare(a.date))
    .slice(0, TOP_N);

  return {
    totalMeals: meals.length,
    restaurantCount: byRestaurant.size,
    totalSpent: sumOrNull(prices),
    averageRating: average(ratings),
    monthly,
    topRestaurants,
    topDishes,
  };
}
