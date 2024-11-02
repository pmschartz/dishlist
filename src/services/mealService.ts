import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Meal } from '../types';

export async function addMeal(meal: Omit<Meal, 'id'>, userId: string) {
  try {
    const docRef = await addDoc(collection(db, 'meals'), {
      ...meal,
      userId,
    });
    return { ...meal, id: docRef.id };
  } catch (error) {
    console.error('Error adding meal:', error);
    throw error;
  }
}

export async function getMeals(userId: string) {
  try {
    const q = query(collection(db, 'meals'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Meal[];
  } catch (error) {
    console.error('Error getting meals:', error);
    throw error;
  }
}

export async function deleteMeal(id: string) {
  try {
    await deleteDoc(doc(db, 'meals', id));
  } catch (error) {
    console.error('Error deleting meal:', error);
    throw error;
  }
}