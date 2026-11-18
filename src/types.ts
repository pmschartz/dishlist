export interface Meal {
  id: string;
  restaurantName: string;
  dishName: string;
  rating: number;
  /** Download URL in Firebase Storage, or a data: URL on meals saved before photos moved to Storage. */
  imageUrl: string;
  /** Storage path of the photo, so it can be deleted with the meal. Absent for older meals. */
  imagePath?: string;
  notes: string;
  /** ISO 8601 timestamp of when the meal was added. */
  date: string;
  price?: number;
}

/** What the form hands over when adding or editing a meal. */
export interface MealInput {
  restaurantName: string;
  dishName: string;
  rating: number;
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
