import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  setLogLevel,
  updateDoc,
  where,
} from 'firebase/firestore';

// Runs against the Firestore emulator: npm run test:rules
let env: RulesTestEnvironment;

const meal = (userId: string) => ({
  userId,
  restaurantName: 'Luigi’s',
  dishName: 'Carbonara',
  rating: 4,
  notes: '',
  imageUrl: '',
  date: '2026-11-18T12:00:00.000Z',
});

const db = (uid?: string) =>
  (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

/** Put a meal in place directly, bypassing the rules. */
async function seedMeal(id: string, userId: string) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'meals', id), meal(userId));
  });
}

beforeAll(async () => {
  setLogLevel('error'); // denied requests are expected; keep the output readable
  env = await initializeTestEnvironment({
    projectId: 'demo-meal-tracker',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

describe('creating meals', () => {
  it('lets a user create their own meal', async () => {
    await assertSucceeds(setDoc(doc(db('alice'), 'meals/m1'), meal('alice')));
  });

  it('blocks creating a meal owned by someone else', async () => {
    await assertFails(setDoc(doc(db('alice'), 'meals/m1'), meal('bob')));
  });

  it('blocks creating a meal with no owner', async () => {
    const ownerless: Record<string, unknown> = meal('alice');
    delete ownerless.userId;
    await assertFails(setDoc(doc(db('alice'), 'meals/m1'), ownerless));
  });

  it('blocks signed-out users', async () => {
    await assertFails(setDoc(doc(db(), 'meals/m1'), meal('alice')));
  });
});

describe('reading meals', () => {
  beforeEach(async () => {
    await seedMeal('alices', 'alice');
    await seedMeal('bobs', 'bob');
  });

  it('lets a user read their own meal', async () => {
    await assertSucceeds(getDoc(doc(db('alice'), 'meals/alices')));
  });

  it("blocks reading someone else's meal", async () => {
    await assertFails(getDoc(doc(db('alice'), 'meals/bobs')));
  });

  it('blocks signed-out reads', async () => {
    await assertFails(getDoc(doc(db(), 'meals/alices')));
  });

  it("allows the app's query for your own meals", async () => {
    await assertSucceeds(getDocs(query(collection(db('alice'), 'meals'), where('userId', '==', 'alice'))));
  });

  it('blocks listing all meals', async () => {
    await assertFails(getDocs(collection(db('alice'), 'meals')));
  });

  it("blocks querying for someone else's meals", async () => {
    await assertFails(getDocs(query(collection(db('alice'), 'meals'), where('userId', '==', 'bob'))));
  });
});

describe('updating meals', () => {
  beforeEach(async () => {
    await seedMeal('alices', 'alice');
  });

  it('lets a user edit their own meal', async () => {
    await assertSucceeds(updateDoc(doc(db('alice'), 'meals/alices'), { dishName: 'Cacio e Pepe', rating: 5 }));
  });

  it('blocks handing a meal to another user', async () => {
    await assertFails(updateDoc(doc(db('alice'), 'meals/alices'), { userId: 'bob' }));
  });

  it("blocks editing someone else's meal", async () => {
    await assertFails(updateDoc(doc(db('bob'), 'meals/alices'), { dishName: 'Hacked' }));
  });

  it("blocks taking over someone else's meal", async () => {
    await assertFails(updateDoc(doc(db('bob'), 'meals/alices'), { userId: 'bob' }));
  });
});

describe('deleting meals', () => {
  beforeEach(async () => {
    await seedMeal('alices', 'alice');
  });

  it('lets a user delete their own meal', async () => {
    await assertSucceeds(deleteDoc(doc(db('alice'), 'meals/alices')));
  });

  it("blocks deleting someone else's meal", async () => {
    await assertFails(deleteDoc(doc(db('bob'), 'meals/alices')));
  });
});

describe('everything else', () => {
  it('blocks other collections', async () => {
    await assertFails(setDoc(doc(db('alice'), 'users/alice'), { name: 'Alice' }));
    await assertFails(getDoc(doc(db('alice'), 'users/alice')));
  });
});
