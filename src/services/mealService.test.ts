import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestore = vi.hoisted(() => ({
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
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
vi.mock('../lib/firebase', () => ({ db: {}, storage: {} }));

import { addMeal, deleteMeal, getMeals, imagePathFor } from './mealService';
import type { Meal, NewMeal } from '../types';

const baseMeal: NewMeal = {
  restaurantName: 'Luigi’s',
  dishName: 'Carbonara',
  rating: 4,
  notes: '',
};

beforeEach(() => {
  vi.clearAllMocks();
  firestore.doc.mockImplementation((_db: unknown, ...path: string[]) =>
    path.length > 1 ? { id: path[1] } : { id: 'meal-123' },
  );
  firestore.setDoc.mockResolvedValue(undefined);
  storage.uploadBytes.mockResolvedValue(undefined);
  storage.getDownloadURL.mockResolvedValue('https://storage.example/photo.jpg');
  storage.deleteObject.mockResolvedValue(undefined);
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
});

describe('getMeals', () => {
  it('returns meals newest first', async () => {
    const docs = [
      { id: 'a', data: () => ({ dishName: 'Old', date: '2024-11-02T12:00:00.000Z' }) },
      { id: 'b', data: () => ({ dishName: 'New', date: '2026-11-18T12:00:00.000Z' }) },
      { id: 'c', data: () => ({ dishName: 'Mid', date: '2025-06-01T12:00:00.000Z' }) },
    ];
    firestore.getDocs.mockResolvedValue({ docs });

    const meals = await getMeals('user-1');

    expect(meals.map((m) => m.dishName)).toEqual(['New', 'Mid', 'Old']);
    expect(firestore.where).toHaveBeenCalledWith('userId', '==', 'user-1');
  });
});

describe('deleteMeal', () => {
  const meal: Meal = { id: 'meal-9', ...baseMeal, imageUrl: '', date: '2026-01-01T00:00:00.000Z' };

  it('deletes the photo along with the meal', async () => {
    await deleteMeal({ ...meal, imagePath: 'users/u/meals/meal-9.jpg' });

    expect(firestore.deleteDoc).toHaveBeenCalledWith({ id: 'meal-9' });
    expect(storage.deleteObject).toHaveBeenCalledWith({ path: 'users/u/meals/meal-9.jpg' });
  });

  it('skips Storage for older meals without a photo path', async () => {
    await deleteMeal({ ...meal, imageUrl: 'data:image/png;base64,AAAA' });
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });

  it('still succeeds if the photo is already gone', async () => {
    storage.deleteObject.mockRejectedValue(new Error('object-not-found'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(deleteMeal({ ...meal, imagePath: 'users/u/meals/meal-9.jpg' })).resolves.toBeUndefined();
  });
});
