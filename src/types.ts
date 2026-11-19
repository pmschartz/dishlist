/** Would you order it again? */
export type Verdict = 'again' | 'maybe' | 'skip';

export type TweakKind = 'remove' | 'add' | 'swap' | 'side';

/** One thing to ask for next time, in the words you'd say to a server: "No onions". */
export interface Tweak {
  kind: TweakKind;
  text: string;
}

/** A specific restaurant location picked from the place search, so two Perkins stay apart. */
export interface PlaceRef {
  /** OpenStreetMap id, e.g. "osm:W231765901". */
  id: string;
  /** Short street address, e.g. "6920 Wayzata Boulevard, Golden Valley". */
  address?: string;
  lat: number;
  lon: number;
}

/** One time you had a dish (a single Firestore document in `meals`). */
export interface Meal {
  id: string;
  restaurantName: string;
  /** Which location, when picked from the place search. Absent for typed-in names and older meals. */
  place?: PlaceRef;
  dishName: string;
  /** 1–5 (Nope, Meh, Fine, Good, Obsessed); 0 = not rated. */
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
  /** Undefined means a typed-in name with no specific location (removes it when editing). */
  place?: PlaceRef;
  dishName: string;
  rating: number;
  verdict?: Verdict;
  tweaks: Tweak[];
  notes: string;
  price?: number;
  /** When you had it (ISO 8601). Undefined when logging means right now. */
  date?: string;
  /**
   * Photo change, already resized:
   * - a Blob uploads it (replacing any existing photo)
   * - null means no photo (removes the existing one when editing)
   * - undefined keeps the current photo when editing
   */
  image?: Blob | null;
}
