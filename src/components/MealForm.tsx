import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { Combobox } from './Combobox';

interface MealFormProps {
  onSubmit: (meal: Omit<Meal, 'id' | 'date'>) => void;
  restaurants: string[];
}

export function MealForm({ onSubmit, restaurants }: MealFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [restaurantName, setRestaurantName] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    onSubmit({
      restaurantName,
      dishName: formData.get('dishName') as string,
      rating,
      imageUrl,
      notes: formData.get('notes') as string,
      price: parseFloat(formData.get('price') as string) || undefined,
    });
    
    e.currentTarget.reset();
    setRating(0);
    setImageUrl('');
    setRestaurantName('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-lg">
      <div className="space-y-4">
        <div>
          <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700 mb-1">
            Restaurant Name
          </label>
          <Combobox
            options={restaurants}
            value={restaurantName}
            onChange={setRestaurantName}
            placeholder="Select restaurant or enter new..."
          />
        </div>

        <div>
          <label htmlFor="dishName" className="block text-sm font-medium text-gray-700">
            Dish Name
          </label>
          <input
            required
            type="text"
            name="dishName"
            id="dishName"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Price
          </label>
          <div className="relative mt-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
            <input
              type="number"
              name="price"
              id="price"
              step="0.01"
              className="block w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <ImageUpload value={imageUrl} onChange={setImageUrl} />

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            name="notes"
            id="notes"
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!restaurantName}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Add Meal
      </button>
    </form>
  );
}