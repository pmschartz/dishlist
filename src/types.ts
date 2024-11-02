export interface Meal {
  id: string;
  restaurantName: string;
  dishName: string;
  rating: number;
  imageUrl: string;
  notes: string;
  date: string;
  price?: number;
}