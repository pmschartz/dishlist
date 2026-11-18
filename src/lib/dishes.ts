import type { Meal, Tweak, Verdict } from '../types';

/** A dish = every time you logged the same dish at the same restaurant. */
export interface Dish {
  /** Stable id: normalized restaurant + dish name. */
  key: string;
  name: string;
  restaurant: string;
  /** Newest first. */
  logs: Meal[];
  latest: Meal;
  /** Verdict and tweaks come from the latest log that has them: they describe how you order it now. */
  verdict?: Verdict;
  tweaks: Tweak[];
  /** Average of this dish's own ratings (unrated logs ignored), or null. */
  rating: number | null;
  timesOrdered: number;
  lastDate: string;
  /** The newest photo, if any log has one. */
  photo?: string;
  /** Most recent price, if any. */
  price?: number;
}

/** A place = every dish logged at one restaurant. */
export interface Place {
  key: string;
  name: string;
  /** Best first: order-again, then maybe, then the rest; higher rated first within each. */
  dishes: Dish[];
  /** Distinct days you logged something there. */
  visits: number;
  lastDate: string;
  /** Every tweak for dishes you'd order again or maybe: the "next time here" list. */
  tweaks: { dish: string; tweak: Tweak }[];
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export const dishKey = (restaurant: string, dish: string) => `${normalize(restaurant)}|${normalize(dish)}`;
export const placeKey = (restaurant: string) => normalize(restaurant);

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const newestFirst = (a: Meal, b: Meal) => b.date.localeCompare(a.date);

/** Group logs into dishes, newest-logged dish first. */
export function groupDishes(meals: Meal[]): Dish[] {
  const groups = new Map<string, Meal[]>();
  for (const meal of meals) {
    const key = dishKey(meal.restaurantName, meal.dishName);
    groups.set(key, [...(groups.get(key) ?? []), meal]);
  }
  return [...groups.entries()]
    .map(([key, group]) => {
      const logs = [...group].sort(newestFirst);
      const latest = logs[0];
      return {
        key,
        // Display the most recent spelling.
        name: latest.dishName.trim(),
        restaurant: latest.restaurantName.trim(),
        logs,
        latest,
        verdict: logs.find((m) => m.verdict)?.verdict,
        tweaks: logs.find((m) => m.tweaks?.length)?.tweaks ?? [],
        rating: average(logs.flatMap((m) => (m.rating > 0 ? [m.rating] : []))),
        timesOrdered: logs.length,
        lastDate: latest.date,
        photo: logs.find((m) => m.imageUrl)?.imageUrl,
        price: logs.find((m) => m.price != null)?.price,
      };
    })
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

const VERDICT_RANK: Record<string, number> = { again: 0, maybe: 1, none: 2, skip: 3 };

/** Best first, as RestaurantCard wants. */
export function bestFirst(a: Dish, b: Dish) {
  return (
    VERDICT_RANK[a.verdict ?? 'none'] - VERDICT_RANK[b.verdict ?? 'none'] ||
    (b.rating ?? 0) - (a.rating ?? 0) ||
    b.lastDate.localeCompare(a.lastDate)
  );
}

/** Group dishes into places, most recently visited first. */
export function groupPlaces(dishes: Dish[]): Place[] {
  const groups = new Map<string, Dish[]>();
  for (const dish of dishes) {
    const key = placeKey(dish.restaurant);
    groups.set(key, [...(groups.get(key) ?? []), dish]);
  }
  return [...groups.entries()]
    .map(([key, group]) => {
      const sorted = [...group].sort(bestFirst);
      const days = new Set(group.flatMap((d) => d.logs.map((m) => localDay(m.date))));
      const lastDate = group.reduce((latest, d) => (d.lastDate > latest ? d.lastDate : latest), '');
      const newest = group.find((d) => d.lastDate === lastDate) ?? group[0];
      return {
        key,
        name: newest.restaurant,
        dishes: sorted,
        visits: days.size,
        lastDate,
        tweaks: sorted
          .filter((d) => d.verdict !== 'skip')
          .flatMap((d) => d.tweaks.map((tweak) => ({ dish: d.name, tweak }))),
      };
    })
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}

function localDay(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * "Your usuals": dishes you'd order again, highest rated and most ordered first.
 * Falls back to your best-rated dishes if nothing is marked "Order again" yet.
 */
export function usuals(dishes: Dish[], limit = 3): Dish[] {
  const score = (d: Dish) => (d.rating ?? 0) * 10 + d.timesOrdered;
  const again = dishes.filter((d) => d.verdict === 'again');
  const pool = again.length ? again : dishes.filter((d) => (d.rating ?? 0) >= 4);
  return [...pool].sort((a, b) => score(b) - score(a) || b.lastDate.localeCompare(a.lastDate)).slice(0, limit);
}
