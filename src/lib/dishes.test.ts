import { describe, expect, it } from 'vitest';
import { dishKey, groupDishes, groupPlaces, placeKey, usuals } from './dishes';
import type { Meal } from '../types';

let n = 0;
const meal = (o: Partial<Meal>): Meal => ({
  id: `m${n++}`,
  restaurantName: 'Lotus Thai Kitchen',
  dishName: 'Pad see ew',
  rating: 4,
  imageUrl: '',
  notes: '',
  date: '2026-11-01T19:00:00.000Z',
  ...o,
});

describe('groupDishes', () => {
  it('groups logs of the same dish at the same place, ignoring case and spacing', () => {
    const dishes = groupDishes([
      meal({ dishName: 'Pad see ew', date: '2026-10-01T19:00:00.000Z' }),
      meal({ dishName: '  pad  SEE ew ', restaurantName: 'lotus thai kitchen', date: '2026-11-01T19:00:00.000Z' }),
      meal({ dishName: 'Pad see ew', restaurantName: 'Other Place' }),
    ]);

    expect(dishes).toHaveLength(2);
    const lotus = dishes.find((d) => d.key === dishKey('Lotus Thai Kitchen', 'Pad see ew'))!;
    expect(lotus.timesOrdered).toBe(2);
    // Shows the newest spelling.
    expect(lotus.name).toBe('pad  SEE ew');
    expect(lotus.logs.map((m) => m.date)).toEqual(['2026-11-01T19:00:00.000Z', '2026-10-01T19:00:00.000Z']);
  });

  it("averages the dish's own ratings, ignoring unrated logs", () => {
    const [dish] = groupDishes([meal({ rating: 5 }), meal({ rating: 4 }), meal({ rating: 0 })]);
    expect(dish.rating).toBe(4.5);
    expect(groupDishes([meal({ rating: 0 })])[0].rating).toBeNull();
  });

  it('takes verdict, tweaks, photo and price from the newest log that has them', () => {
    const [dish] = groupDishes([
      meal({ date: '2026-11-03T00:00:00.000Z' }),
      meal({ date: '2026-11-02T00:00:00.000Z', verdict: 'again', tweaks: [{ kind: 'remove', text: 'No onions' }], price: 16 }),
      meal({ date: '2026-11-01T00:00:00.000Z', verdict: 'skip', imageUrl: 'https://x/old.jpg', price: 12 }),
    ]);
    expect(dish.verdict).toBe('again');
    expect(dish.tweaks).toEqual([{ kind: 'remove', text: 'No onions' }]);
    expect(dish.photo).toBe('https://x/old.jpg');
    expect(dish.price).toBe(16);
  });

  it('lists the most recently logged dish first', () => {
    const dishes = groupDishes([
      meal({ dishName: 'Old', date: '2026-01-01T00:00:00.000Z' }),
      meal({ dishName: 'New', date: '2026-11-01T00:00:00.000Z' }),
    ]);
    expect(dishes.map((d) => d.name)).toEqual(['New', 'Old']);
  });
});

describe('groupPlaces', () => {
  const dishes = groupDishes([
    meal({ dishName: 'Mango sticky rice', verdict: 'skip', rating: 2, tweaks: [{ kind: 'add', text: 'Extra mango' }], date: '2026-11-01T19:00:00.000Z' }),
    meal({ dishName: 'Green curry', verdict: 'maybe', rating: 3, date: '2026-11-01T19:30:00.000Z' }),
    meal({ dishName: 'Pad see ew', verdict: 'again', rating: 5, tweaks: [{ kind: 'remove', text: 'No onions' }], date: '2026-10-15T19:00:00.000Z' }),
    meal({ dishName: 'Pad see ew', verdict: 'again', rating: 5, date: '2026-09-01T19:00:00.000Z' }),
    meal({ restaurantName: 'Bao Down', dishName: 'Pork belly bao', date: '2026-11-10T19:00:00.000Z' }),
  ]);
  const places = groupPlaces(dishes);
  const lotus = places.find((p) => p.key === placeKey('Lotus Thai Kitchen'))!;

  it('lists the most recently visited place first', () => {
    expect(places.map((p) => p.name)).toEqual(['Bao Down', 'Lotus Thai Kitchen']);
  });

  it('orders dishes best first: order again, maybe, unmarked, skip', () => {
    expect(lotus.dishes.map((d) => d.name)).toEqual(['Pad see ew', 'Green curry', 'Mango sticky rice']);
  });

  it('counts distinct days as visits', () => {
    expect(lotus.visits).toBe(3);
  });

  it("collects next-time tweaks, leaving out dishes you'd skip", () => {
    expect(lotus.tweaks).toEqual([{ dish: 'Pad see ew', tweak: { kind: 'remove', text: 'No onions' } }]);
  });
});

describe('usuals', () => {
  it("picks dishes you'd order again, best rated and most ordered first", () => {
    const dishes = groupDishes([
      meal({ dishName: 'A', verdict: 'again', rating: 4 }),
      meal({ dishName: 'B', verdict: 'again', rating: 5 }),
      meal({ dishName: 'C', verdict: 'maybe', rating: 5 }),
      meal({ dishName: 'A', verdict: 'again', rating: 4 }),
    ]);
    expect(usuals(dishes).map((d) => d.name)).toEqual(['B', 'A']);
  });

  it('falls back to dishes rated 4 or more when nothing is marked order again', () => {
    const dishes = groupDishes([meal({ dishName: 'Great', rating: 5 }), meal({ dishName: 'Fine', rating: 3 })]);
    expect(usuals(dishes).map((d) => d.name)).toEqual(['Great']);
  });
});

describe('places picked from the search', () => {
  const golden = { id: 'osm:W1', address: '6920 Wayzata Boulevard, Golden Valley', lat: 44.97, lon: -93.37 };
  const roseville = { id: 'osm:W2', address: '1495 County Road B West, Roseville', lat: 45.0, lon: -93.16 };

  it('keeps two locations with the same name apart', () => {
    const dishes = groupDishes([
      meal({ restaurantName: 'Perkins', dishName: 'Pancakes', place: golden }),
      meal({ restaurantName: 'Perkins', dishName: 'Pancakes', place: roseville }),
    ]);
    expect(dishes).toHaveLength(2);
    const places = groupPlaces(dishes);
    expect(places.map((p) => p.key).sort()).toEqual(['osm:W1', 'osm:W2']);
    expect(places.find((p) => p.key === 'osm:W1')!.place).toEqual(golden);
  });

  it('files typed-in visits with the one picked location of that name', () => {
    const dishes = groupDishes([
      meal({ restaurantName: 'perkins', dishName: 'Pancakes', date: '2026-01-01T19:00:00.000Z' }),
      meal({ restaurantName: 'Perkins', dishName: 'Pancakes', place: golden }),
    ]);
    expect(dishes).toHaveLength(1);
    expect(dishes[0].key).toBe(dishKey('osm:W1', 'Pancakes'));
    expect(dishes[0].timesOrdered).toBe(2);
    expect(dishes[0].place).toEqual(golden);
  });

  it('leaves typed-in visits on their own once there are several locations of that name', () => {
    const dishes = groupDishes([
      meal({ restaurantName: 'Perkins', dishName: 'Pancakes' }),
      meal({ restaurantName: 'Perkins', dishName: 'Pancakes', place: golden }),
      meal({ restaurantName: 'Perkins', dishName: 'Pancakes', place: roseville }),
    ]);
    expect(groupPlaces(dishes).map((p) => p.key).sort()).toEqual(['osm:W1', 'osm:W2', placeKey('Perkins')]);
  });
});
