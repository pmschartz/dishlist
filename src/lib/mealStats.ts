import { groupDishes, groupPlaces, type Dish } from './dishes';
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

export interface PlaceStats {
  name: string;
  visits: number;
  dishes: number;
  toOrderAgain: number;
  /** Total of priced logs, or null if none have a price. */
  spent: number | null;
}

export interface MealStats {
  /** Every time you logged a dish. */
  totalLogs: number;
  /** Distinct dishes (same dish at the same place counts once). */
  totalDishes: number;
  placeCount: number;
  /** Sum of all prices, or null if no log has a price. */
  totalSpent: number | null;
  /** Average over rated logs (0 means "not rated"), or null. */
  averageRating: number | null;
  toOrderAgain: number;
  /** The last 12 months, oldest first, ending with the month of `now`. */
  monthly: MonthCount[];
  /** Most-visited first (ties: more dishes to order again, then name). At most 5. Never an averaged score. */
  topPlaces: PlaceStats[];
  /** Your favorites: highest rated, then most ordered. At most 5, rated dishes only. */
  topDishes: Dish[];
}

const TOP_N = 5;

const sumOrNull = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) : null);
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

export function computeStats(meals: Meal[], now = new Date()): MealStats {
  const dishes = groupDishes(meals);
  const places = groupPlaces(dishes);
  const ratings = meals.flatMap((m) => (m.rating > 0 ? [m.rating] : []));

  // Months are bucketed in local time, matching the dates shown elsewhere.
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

  const topPlaces = places
    .map((p) => ({
      name: p.name,
      visits: p.visits,
      dishes: p.dishes.length,
      toOrderAgain: p.dishes.filter((d) => d.verdict === 'again').length,
      spent: sumOrNull(p.dishes.flatMap((d) => d.logs.flatMap((m) => (m.price != null ? [m.price] : [])))),
    }))
    .sort((a, b) => b.visits - a.visits || b.toOrderAgain - a.toOrderAgain || a.name.localeCompare(b.name))
    .slice(0, TOP_N);

  const topDishes = dishes
    .filter((d) => d.rating != null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.timesOrdered - a.timesOrdered || b.lastDate.localeCompare(a.lastDate))
    .slice(0, TOP_N);

  return {
    totalLogs: meals.length,
    totalDishes: dishes.length,
    placeCount: places.length,
    totalSpent: sumOrNull(meals.flatMap((m) => (m.price != null ? [m.price] : []))),
    averageRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    toOrderAgain: dishes.filter((d) => d.verdict === 'again').length,
    monthly,
    topPlaces,
    topDishes,
  };
}
