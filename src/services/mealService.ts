import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db } from '../lib/firestore';
import { storage } from '../lib/storage';
import type { Meal, MealInput } from '../types';

export const PHOTO_NEEDS_CONNECTION =
  "Photos can only be added while you're online. Save without the photo, or try again once you're connected.";

/**
 * Where a meal's photo lives in Storage. Must match storage.rules. A replacement photo gets
 * a `version` suffix so its URL changes and browsers don't keep showing the old one.
 */
export function imagePathFor(userId: string, mealId: string, version?: number) {
  return `users/${userId}/meals/${mealId}${version ? `-${version}` : ''}.jpg`;
}

function isOnline() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

/**
 * Firestore applies writes to the local cache immediately (the live meal list shows them
 * at once), but the returned promise only settles when the server confirms. Offline, that
 * would leave the UI waiting until the connection returns, so we don't wait: the write
 * stays queued on the device and is sent automatically later.
 */
async function commit(write: Promise<void>, description: string) {
  if (isOnline()) {
    await write;
  } else {
    write.catch((error) => console.error(`Queued ${description} failed to sync:`, error));
  }
}

async function uploadPhoto(path: string, image: Blob) {
  if (!isOnline()) throw new Error(PHOTO_NEEDS_CONNECTION);
  const photoRef = ref(storage, path);
  await uploadBytes(photoRef, image, { contentType: 'image/jpeg' });
  return getDownloadURL(photoRef);
}

/** Delete a photo, logging instead of failing: a leftover file isn't worth an error. */
export async function removePhoto(path: string | undefined) {
  if (!path) return;
  await deleteObject(ref(storage, path)).catch((error) => {
    console.warn('Could not delete photo', path, error);
  });
}

/** Firestore rejects fields set to `undefined`, so leave them out entirely. */
function withoutUndefined<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Partial<T>;
}

export async function addMeal(input: MealInput, userId: string): Promise<Meal> {
  const { image, ...fields } = input;
  // Generate the document ID up front so the photo can be stored under it.
  const mealRef = doc(collection(db, 'meals'));

  let imageUrl = '';
  let imagePath: string | undefined;
  if (image) {
    imagePath = imagePathFor(userId, mealRef.id);
    imageUrl = await uploadPhoto(imagePath, image);
  }

  const meal: Omit<Meal, 'id'> = {
    ...fields,
    imageUrl,
    imagePath,
    date: fields.date ?? new Date().toISOString(),
  };

  try {
    await commit(setDoc(mealRef, { ...withoutUndefined(meal), userId }), 'new meal');
  } catch (error) {
    // Don't leave an orphaned photo behind if the meal itself couldn't be saved.
    await removePhoto(imagePath);
    throw error;
  }

  return { id: mealRef.id, ...meal };
}

export async function updateMeal(meal: Meal, input: MealInput, userId: string): Promise<void> {
  const { image, ...fields } = input;
  const changes: Record<string, unknown> = {
    ...fields,
    // Clearing the price, verdict or place removes the field rather than storing undefined.
    price: fields.price ?? deleteField(),
    // Editing never clears when you went; undefined keeps the saved date.
    date: fields.date ?? meal.date,
    verdict: fields.verdict ?? deleteField(),
    place: fields.place ?? deleteField(),
  };

  let replacedPhoto: string | undefined;
  if (image) {
    const path = imagePathFor(userId, meal.id, Date.now());
    changes.imageUrl = await uploadPhoto(path, image);
    changes.imagePath = path;
    replacedPhoto = meal.imagePath;
  } else if (image === null && meal.imageUrl) {
    changes.imageUrl = '';
    changes.imagePath = deleteField();
    replacedPhoto = meal.imagePath;
  }

  try {
    await commit(updateDoc(doc(db, 'meals', meal.id), changes), 'meal update');
  } catch (error) {
    if (image) await removePhoto(changes.imagePath as string);
    throw error;
  }
  // Only remove the old photo once the meal no longer points at it.
  await removePhoto(replacedPhoto);
}

export interface MealsSnapshot {
  /** Newest first. */
  meals: Meal[];
  /** Meals with changes saved on this device that haven't reached the server yet. */
  pendingIds: Set<string>;
}

/**
 * Live view of a user's meals. Calls `onChange` right away from the local cache (so it works
 * offline) and again whenever a meal is added, edited, deleted or synced.
 */
export function subscribeToMeals(
  userId: string,
  onChange: (snapshot: MealsSnapshot) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const mealsQuery = query(collection(db, 'meals'), where('userId', '==', userId));
  return onSnapshot(
    mealsQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      const meals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Meal);
      // Sorted here rather than with orderBy() so no composite index is needed.
      meals.sort((a, b) => b.date.localeCompare(a.date));
      const pendingIds = new Set(snapshot.docs.filter((d) => d.metadata.hasPendingWrites).map((d) => d.id));
      onChange({ meals, pendingIds });
    },
    onError,
  );
}

/**
 * Delete a meal. With `keepPhoto`, the photo stays in Storage so an Undo can bring the meal
 * back whole; call removePhoto(meal.imagePath) once the undo window has passed.
 */
export async function deleteMeal(meal: Meal, { keepPhoto = false } = {}): Promise<void> {
  await commit(deleteDoc(doc(db, 'meals', meal.id)), 'delete');
  // Offline, this fails and the photo is left behind in Storage; the meal is still deleted.
  if (!keepPhoto) await removePhoto(meal.imagePath);
}

/** Undo a delete: write the meal back under its original id. */
export async function restoreMeal(meal: Meal, userId: string): Promise<void> {
  const { id, ...fields } = meal;
  await commit(setDoc(doc(db, 'meals', id), { ...withoutUndefined(fields), userId }), 'restore');
}
