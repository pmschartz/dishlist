import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';

// Runs against the Storage emulator: npm run test:rules
let env: RulesTestEnvironment;

const jpeg = { contentType: 'image/jpeg' };
const smallPhoto = new Uint8Array(1024);
const alicesPhoto = 'users/alice/meals/m1.jpg';

const storage = (uid?: string) =>
  (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).storage();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-meal-tracker',
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearStorage();
});

/** Put a photo in place directly, bypassing the rules. */
async function seedPhoto(path: string) {
  await env.withSecurityRulesDisabled(async (context) => {
    await uploadBytes(ref(context.storage(), path), smallPhoto, jpeg);
  });
}

describe('uploading photos', () => {
  it('lets a user upload a photo to their own folder', async () => {
    await assertSucceeds(uploadBytes(ref(storage('alice'), alicesPhoto), smallPhoto, jpeg));
  });

  it("blocks uploading to someone else's folder", async () => {
    await assertFails(uploadBytes(ref(storage('bob'), alicesPhoto), smallPhoto, jpeg));
  });

  it('blocks signed-out uploads', async () => {
    await assertFails(uploadBytes(ref(storage(), alicesPhoto), smallPhoto, jpeg));
  });

  it('blocks files that are not images', async () => {
    await assertFails(
      uploadBytes(ref(storage('alice'), 'users/alice/meals/m1.jpg'), smallPhoto, { contentType: 'text/html' }),
    );
  });

  it('blocks files of 5 MB or more', async () => {
    const tooBig = new Uint8Array(5 * 1024 * 1024);
    await assertFails(uploadBytes(ref(storage('alice'), alicesPhoto), tooBig, jpeg));
  });

  it('blocks paths outside users/{uid}/meals', async () => {
    await assertFails(uploadBytes(ref(storage('alice'), 'users/alice/avatar.jpg'), smallPhoto, jpeg));
    await assertFails(uploadBytes(ref(storage('alice'), 'public/m1.jpg'), smallPhoto, jpeg));
  });
});

describe('reading and deleting photos', () => {
  beforeEach(async () => {
    await seedPhoto(alicesPhoto);
  });

  it('lets a user read their own photo', async () => {
    await assertSucceeds(getBytes(ref(storage('alice'), alicesPhoto)));
  });

  it("blocks reading someone else's photo", async () => {
    await assertFails(getBytes(ref(storage('bob'), alicesPhoto)));
  });

  it('lets a user delete their own photo', async () => {
    await assertSucceeds(deleteObject(ref(storage('alice'), alicesPhoto)));
  });

  it("blocks deleting someone else's photo", async () => {
    await assertFails(deleteObject(ref(storage('bob'), alicesPhoto)));
  });
});
