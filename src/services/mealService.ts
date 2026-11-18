import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import type { Meal, NewMeal } from '../types';

/** Where a meal's photo lives in Storage. Must match storage.rules. */
export function imagePathFor(userId: string, mealId: string) {
  return `users/${userId}/meals/${mealId}.jpg`;
}

/** Firestore rejects fields set to `undefined`, so leave them out entirely. */
function withoutUndefined<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Partial<T>;
}

export async function addMeal(input: NewMeal, userId: string): Promise<Meal> {
  const { image, ...fields } = input;
  // Generate the document ID up front so the photo can be stored under it.
  const mealRef = doc(collection(db, 'meals'));

  let imageUrl = '';
  let imagePath: string | undefined;
  if (image) {
    imagePath = imagePathFor(userId, mealRef.id);
    const photoRef = ref(storage, imagePath);
    await uploadBytes(photoRef, image, { contentType: 'image/jpeg' });
    imageUrl = await getDownloadURL(photoRef);
  }

  const meal: Omit<Meal, 'id'> = {
    ...fields,
    imageUrl,
    imagePath,
    date: new Date().toISOString(),
  };

  try {
    await setDoc(mealRef, { ...withoutUndefined(meal), userId });
  } catch (error) {
    // Don't leave an orphaned photo behind if the meal itself couldn't be saved.
    if (imagePath) await deleteObject(ref(storage, imagePath)).catch(() => {});
    throw error;
  }

  return { id: mealRef.id, ...meal };
}

/** All of a user's meals, newest first. */
export async function getMeals(userId: string): Promise<Meal[]> {
  const snapshot = await getDocs(query(collection(db, 'meals'), where('userId', '==', userId)));
  const meals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Meal);
  // Sorted here rather than with orderBy() so no composite index is needed.
  return meals.sort((a, b) => b.date.localeCompare(a.date));
}

export async function deleteMeal(meal: Meal): Promise<void> {
  await deleteDoc(doc(db, 'meals', meal.id));
  if (meal.imagePath) {
    // The meal is already gone; a leftover photo isn't worth failing over.
    await deleteObject(ref(storage, meal.imagePath)).catch((error) => {
      console.warn('Could not delete photo for meal', meal.id, error);
    });
  }
}
