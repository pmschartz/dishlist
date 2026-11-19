import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const DELETE_FIELD = { __deleteField: true };

const firestore = vi.hoisted(() => ({
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  doc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  deleteField: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
}));
const storage = vi.hoisted(() => ({
  ref: vi.fn((_storage: unknown, path: string) => ({ path })),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
}));

vi.mock('firebase/firestore', () => firestore);
vi.mock('firebase/storage', () => storage);
vi.mock('../lib/firestore', () => ({ db: {} }));
vi.mock('../lib/storage', () => ({ storage: {} }));

import {
  addMeal,
  deleteMeal,
  imagePathFor,
  PHOTO_NEEDS_CONNECTION,
  restoreMeal,
  subscribeToMeals,
  updateMeal,
  type MealsSnapshot,
} from './mealService';
import type { Meal, MealInput } from '../types';

const baseMeal: MealInput = {
  restaurantName: 'Luigi’s',
  dishName: 'Carbonara',
  rating: 4,
  tweaks: [],
  notes: '',
};

const savedMeal: Meal = {
  id: 'meal-9',
  restaurantName: 'Luigi’s',
  dishName: 'Carbonara',
  rating: 4,
  notes: '',
  price: 18,
  imageUrl: 'https://storage.example/old.jpg',
  imagePath: 'users/user-1/meals/meal-9.jpg',
  date: '2026-01-01T00:00:00.000Z',
};

/** A write promise that never settles, like Firestore's while offline. */
const neverSettles = () => new Promise<void>(() => {});

function goOffline() {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
}

beforeEach(() => {
  vi.clearAllMocks();
  firestore.doc.mockImplementation((_db: unknown, ...path: string[]) =>
    path.length > 1 ? { id: path[1] } : { id: 'meal-123' },
  );
  firestore.deleteField.mockReturnValue(DELETE_FIELD);
  firestore.setDoc.mockResolvedValue(undefined);
  firestore.updateDoc.mockResolvedValue(undefined);
  firestore.deleteDoc.mockResolvedValue(undefined);
  storage.uploadBytes.mockResolvedValue(undefined);
  storage.getDownloadURL.mockResolvedValue('https://storage.example/photo.jpg');
  storage.deleteObject.mockResolvedValue(undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('addMeal', () => {
  it('leaves out undefined fields, which Firestore would reject', async () => {
    await addMeal({ ...baseMeal, price: undefined }, 'user-1');

    const saved = firestore.setDoc.mock.calls[0][1];
    expect(saved).not.toHaveProperty('price');
    expect(saved).not.toHaveProperty('imagePath');
    expect(Object.values(saved)).not.toContain(undefined);
    expect(saved).toMatchObject({ dishName: 'Carbonara', userId: 'user-1', imageUrl: '' });
  });

  it('saves the day you went, or now when none is given', async () => {
    await addMeal({ ...baseMeal, date: '2026-11-12T18:00:00.000Z' }, 'user-1');
    expect(firestore.setDoc.mock.calls[0][1].date).toBe('2026-11-12T18:00:00.000Z');
    await addMeal(baseMeal, 'user-1');
    expect(Date.now() - Date.parse(firestore.setDoc.mock.calls[1][1].date)).toBeLessThan(5000);
  });

  it('keeps a price of 0', async () => {
    await addMeal({ ...baseMeal, price: 0 }, 'user-1');
    expect(firestore.setDoc.mock.calls[0][1]).toHaveProperty('price', 0);
  });

  it('uploads the photo under the user and meal ID and saves its URL and path', async () => {
    const image = new Blob(['jpeg'], { type: 'image/jpeg' });

    const meal = await addMeal({ ...baseMeal, image }, 'user-1');

    const path = 'users/user-1/meals/meal-123.jpg';
    expect(path).toBe(imagePathFor('user-1', 'meal-123'));
    expect(storage.uploadBytes).toHaveBeenCalledWith({ path }, image, { contentType: 'image/jpeg' });
    expect(firestore.setDoc.mock.calls[0][1]).toMatchObject({
      imageUrl: 'https://storage.example/photo.jpg',
      imagePath: path,
    });
    expect(firestore.setDoc.mock.calls[0][1]).not.toHaveProperty('image');
    expect(meal).toMatchObject({ id: 'meal-123', imagePath: path });
  });

  it('removes the uploaded photo if saving the meal fails', async () => {
    firestore.setDoc.mockRejectedValue(new Error('permission-denied'));

    await expect(addMeal({ ...baseMeal, image: new Blob(['x']) }, 'user-1')).rejects.toThrow('permission-denied');
    expect(storage.deleteObject).toHaveBeenCalledWith({ path: 'users/user-1/meals/meal-123.jpg' });
  });

  it('returns right away when offline instead of waiting for the server', async () => {
    goOffline();
    firestore.setDoc.mockReturnValue(neverSettles());

    await expect(addMeal(baseMeal, 'user-1')).resolves.toMatchObject({ id: 'meal-123' });
    expect(firestore.setDoc).toHaveBeenCalled();
  });

  it('refuses to add a photo while offline', async () => {
    goOffline();

    await expect(addMeal({ ...baseMeal, image: new Blob(['x']) }, 'user-1')).rejects.toThrow(PHOTO_NEEDS_CONNECTION);
    expect(storage.uploadBytes).not.toHaveBeenCalled();
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });
});

describe('updateMeal', () => {
  it('saves the edited fields and keeps the photo when image is undefined', async () => {
    const tweaks = [{ kind: 'remove' as const, text: 'No onions' }];
    await updateMeal(savedMeal, { ...baseMeal, dishName: 'Cacio e Pepe', price: 21, verdict: 'again', tweaks, image: undefined }, 'user-1');

    expect(firestore.updateDoc).toHaveBeenCalledWith({ id: 'meal-9' }, {
      restaurantName: 'Luigi’s',
      dishName: 'Cacio e Pepe',
      rating: 4,
      notes: '',
      price: 21,
      verdict: 'again',
      place: DELETE_FIELD,
      date: '2026-01-01T00:00:00.000Z',
      tweaks,
    });
    expect(storage.uploadBytes).not.toHaveBeenCalled();
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('saves a picked location, and removes it when the name is typed in instead', async () => {
    const place = { id: 'osm:W1', address: '1 Main St, Golden Valley', lat: 44.97, lon: -93.37 };
    await updateMeal(savedMeal, { ...baseMeal, place }, 'user-1');
    expect(firestore.updateDoc.mock.calls[0][1].place).toEqual(place);
    await updateMeal({ ...savedMeal, place }, { ...baseMeal, place: undefined }, 'user-1');
    expect(firestore.updateDoc.mock.calls[1][1].place).toBe(DELETE_FIELD);
  });

  it('removes the price and verdict fields when they are cleared', async () => {
    await updateMeal({ ...savedMeal, verdict: 'maybe' }, { ...baseMeal, price: undefined, verdict: undefined }, 'user-1');
    expect(firestore.updateDoc.mock.calls[0][1].price).toBe(DELETE_FIELD);
    expect(firestore.updateDoc.mock.calls[0][1].verdict).toBe(DELETE_FIELD);
  });

  it('uploads a replacement photo to a new path, then deletes the old one', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const image = new Blob(['new'], { type: 'image/jpeg' });

    await updateMeal(savedMeal, { ...baseMeal, image }, 'user-1');

    const newPath = 'users/user-1/meals/meal-9-1700000000000.jpg';
    expect(storage.uploadBytes).toHaveBeenCalledWith({ path: newPath }, image, { contentType: 'image/jpeg' });
    expect(firestore.updateDoc.mock.calls[0][1]).toMatchObject({
      imageUrl: 'https://storage.example/photo.jpg',
      imagePath: newPath,
    });
    expect(storage.deleteObject).toHaveBeenCalledWith({ path: savedMeal.imagePath });
    expect(storage.deleteObject.mock.invocationCallOrder[0]).toBeGreaterThan(
      firestore.updateDoc.mock.invocationCallOrder[0],
    );
  });

  it('removes the photo when image is null', async () => {
    await updateMeal(savedMeal, { ...baseMeal, image: null }, 'user-1');

    expect(firestore.updateDoc.mock.calls[0][1]).toMatchObject({ imageUrl: '', imagePath: DELETE_FIELD });
    expect(storage.deleteObject).toHaveBeenCalledWith({ path: savedMeal.imagePath });
  });

  it('keeps the old photo and removes the new upload if the update fails', async () => {
    firestore.updateDoc.mockRejectedValue(new Error('permission-denied'));
    vi.spyOn(Date, 'now').mockReturnValue(42);

    await expect(updateMeal(savedMeal, { ...baseMeal, image: new Blob(['x']) }, 'user-1')).rejects.toThrow();
    expect(storage.deleteObject).toHaveBeenCalledTimes(1);
    expect(storage.deleteObject).toHaveBeenCalledWith({ path: 'users/user-1/meals/meal-9-42.jpg' });
  });

  it('returns right away when offline', async () => {
    goOffline();
    firestore.updateDoc.mockReturnValue(neverSettles());

    await expect(updateMeal(savedMeal, { ...baseMeal, image: undefined }, 'user-1')).resolves.toBeUndefined();
  });
});

describe('subscribeToMeals', () => {
  function snapshotOf(docs: { id: string; date: string; pending?: boolean }[]) {
    return {
      docs: docs.map(({ id, date, pending }) => ({
        id,
        data: () => ({ dishName: id, date }),
        metadata: { hasPendingWrites: Boolean(pending) },
      })),
    };
  }

  it('sends meals newest first, with the IDs still waiting to sync', () => {
    const unsubscribe = vi.fn();
    firestore.onSnapshot.mockImplementation((_q, _opts, onNext: (s: unknown) => void) => {
      onNext(
        snapshotOf([
          { id: 'old', date: '2024-11-02T12:00:00.000Z' },
          { id: 'new', date: '2026-11-18T12:00:00.000Z', pending: true },
          { id: 'mid', date: '2025-06-01T12:00:00.000Z' },
        ]),
      );
      return unsubscribe;
    });
    const onChange = vi.fn<(s: MealsSnapshot) => void>();

    const stop = subscribeToMeals('user-1', onChange, vi.fn());

    const { meals, pendingIds } = onChange.mock.calls[0][0];
    expect(meals.map((m) => m.id)).toEqual(['new', 'mid', 'old']);
    expect([...pendingIds]).toEqual(['new']);
    expect(firestore.where).toHaveBeenCalledWith('userId', '==', 'user-1');
    expect(firestore.onSnapshot.mock.calls[0][1]).toEqual({ includeMetadataChanges: true });
    expect(stop).toBe(unsubscribe);
  });

  it('passes errors on', () => {
    const failure = new Error('permission-denied');
    firestore.onSnapshot.mockImplementation((_q, _opts, _onNext, onError: (e: Error) => void) => {
      onError(failure);
      return vi.fn();
    });
    const onError = vi.fn();

    subscribeToMeals('user-1', vi.fn(), onError);

    expect(onError).toHaveBeenCalledWith(failure);
  });
});

describe('deleteMeal', () => {
  it('deletes the photo along with the meal', async () => {
    await deleteMeal(savedMeal);

    expect(firestore.deleteDoc).toHaveBeenCalledWith({ id: 'meal-9' });
    expect(storage.deleteObject).toHaveBeenCalledWith({ path: savedMeal.imagePath });
  });

  it('skips Storage for older meals without a photo path', async () => {
    await deleteMeal({ ...savedMeal, imagePath: undefined, imageUrl: 'data:image/png;base64,AAAA' });
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('still succeeds if the photo is already gone', async () => {
    storage.deleteObject.mockRejectedValue(new Error('object-not-found'));
    await expect(deleteMeal(savedMeal)).resolves.toBeUndefined();
  });

  it('can keep the photo so the delete can be undone', async () => {
    await deleteMeal(savedMeal, { keepPhoto: true });
    expect(firestore.deleteDoc).toHaveBeenCalledWith({ id: 'meal-9' });
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });
});

describe('restoreMeal', () => {
  it('writes the meal back under its original id, with its owner', async () => {
    await restoreMeal({ ...savedMeal, verdict: 'again', tweaks: [{ kind: 'add', text: 'Burrata' }] }, 'user-1');

    expect(firestore.setDoc).toHaveBeenCalledWith(
      { id: 'meal-9' },
      expect.objectContaining({ userId: 'user-1', dishName: 'Carbonara', verdict: 'again', imagePath: savedMeal.imagePath }),
    );
    expect(firestore.setDoc.mock.calls[0][1]).not.toHaveProperty('id');
  });
});
