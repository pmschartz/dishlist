import type { Meal, PlaceRef, Tweak, Verdict } from '../types';

/** A dish = every time you logged the same dish at the same restaurant. */
export interface Dish {
  /** Stable id: the place key + normalized dish name. */
  key: string;
  name: string;
  restaurant: string;
  /** Which place this dish belongs to (see placeKeyFor). */
  placeKey: string;
  /** The picked location, if any log at this place has one. */
  place?: PlaceRef;
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
  /** The picked location, when the restaurant came from the place search. */
  place?: PlaceRef;
  /** Best first: order-again, then maybe, then the rest; higher rated first within each. */
  dishes: Dish[];
  /** Distinct days you logged something there. */
  visits: number;
  lastDate: string;
  /** Every tweak for dishes you'd order again or maybe: the "next time here" list. */
  tweaks: { dish: string; tweak: Tweak }[];
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Key for a restaurant typed in by name, with no picked location. */
export const placeKey = (restaurant: string) => normalize(restaurant);
/** Key for a dish; pass a place key from placeKeyFor, or a restaurant name for a typed-in place. */
export const dishKey = (placeOrRestaurant: string, dish: string) =>
  `${placeOrRestaurant.startsWith('osm:') ? placeOrRestaurant : normalize(placeOrRestaurant)}|${normalize(dish)}`;

/**
 * Which place a meal belongs to. A picked location keys by its id, so two Perkins stay apart.
 * A typed-in name (or an older meal) joins the picked location with that name when there's
 * exactly one, so past visits aren't split off; otherwise it keys by the name.
 */
export function placeKeyFor(meal: Pick<Meal, 'restaurantName' | 'place'>, soleIdByName: Map<string, string | null>): string {
  if (meal.place?.id) return meal.place.id;
  const name = placeKey(meal.restaurantName);
  return soleIdByName.get(name) ?? name;
}

/** For each restaurant name, its picked location id if there's exactly one, or null if several. */
export function soleIdsByName(meals: Pick<Meal, 'restaurantName' | 'place'>[]): Map<string, string | null> {
  const ids = new Map<string, Set<string>>();
  for (const meal of meals) {
    if (!meal.place?.id) continue;
    const name = placeKey(meal.restaurantName);
    ids.set(name, (ids.get(name) ?? new Set()).add(meal.place.id));
  }
  return new Map([...ids].map(([name, set]) => [name, set.size === 1 ? [...set][0] : null]));
}

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const newestFirst = (a: Meal, b: Meal) => b.date.localeCompare(a.date);

/** Group logs into dishes, newest-logged dish first. */
export function groupDishes(meals: Meal[]): Dish[] {
  const soleIds = soleIdsByName(meals);
  const groups = new Map<string, { placeKey: string; meals: Meal[] }>();
  for (const meal of meals) {
    const place = placeKeyFor(meal, soleIds);
    const key = dishKey(place, meal.dishName);
    const group = groups.get(key) ?? { placeKey: place, meals: [] };
    group.meals.push(meal);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .map(([key, group]) => {
      const logs = [...group.meals].sort(newestFirst);
      const latest = logs[0];
      return {
        key,
        // Display the most recent spelling.
        name: latest.dishName.trim(),
        restaurant: latest.restaurantName.trim(),
        placeKey: group.placeKey,
        place: logs.find((m) => m.place)?.place,
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
    const key = dish.placeKey;
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
        place: newest.place ?? group.find((d) => d.place)?.place,
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
