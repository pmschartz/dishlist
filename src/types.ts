/** Would you order it again? */
export type Verdict = 'again' | 'maybe' | 'skip';

export type TweakKind = 'remove' | 'add' | 'swap' | 'side';

/** One thing to ask for next time, in the words you'd say to a server: "No onions". */
export interface Tweak {
  kind: TweakKind;
  text: string;
}

/** One time you had a dish (a single Firestore document in `meals`). */
export interface Meal {
  id: string;
  restaurantName: string;
  dishName: string;
  /** 1–5 plates; 0 = not rated. */
  rating: number;
  verdict?: Verdict;
  /** "Next time" tweaks. */
  tweaks?: Tweak[];
  /** Download URL in Firebase Storage, or a data: URL on meals saved before photos moved to Storage. */
  imageUrl: string;
  /** Storage path of the photo, so it can be deleted with the meal. Absent for older meals. */
  imagePath?: string;
  notes: string;
  /** ISO 8601 timestamp of when the meal was logged. */
  date: string;
  price?: number;
}

/** What the log/edit sheet hands over. */
export interface MealInput {
  restaurantName: string;
  dishName: string;
  rating: number;
  verdict?: Verdict;
  tweaks: Tweak[];
  notes: string;
  price?: number;
  /**
   * Photo change, already resized:
   * - a Blob uploads it (replacing any existing photo)
   * - null means no photo (removes the existing one when editing)
   * - undefined keeps the current photo when editing
   */
  image?: Blob | null;
}
