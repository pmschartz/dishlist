import { useState, type FormEvent } from 'react';
import { Star } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { Combobox } from './Combobox';
import { resizeImage } from '../lib/resizeImage';
import type { NewMeal } from '../types';

interface MealFormProps {
  /** Save the meal. Reject to keep the form filled in and show the error. */
  onSubmit: (meal: NewMeal) => Promise<void>;
  restaurants: string[];
}

export function MealForm({ onSubmit, restaurants }: MealFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Grab the form now; React clears e.currentTarget once we await.
    const form = e.currentTarget;
    const formData = new FormData(form);
    const priceText = String(formData.get('price') ?? '').trim();

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        restaurantName: restaurantName.trim(),
        dishName: String(formData.get('dishName') ?? '').trim(),
        rating,
        notes: String(formData.get('notes') ?? '').trim(),
        price: priceText === '' ? undefined : Number(priceText),
        image: photo ? await resizeImage(photo) : null,
      });
      form.reset();
      setRating(0);
      setPhoto(null);
      setRestaurantName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-lg">
      <div className="space-y-4">
        <div>
          <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700 mb-1">
            Restaurant Name
          </label>
          <Combobox
            id="restaurantName"
            options={restaurants}
            value={restaurantName}
            onChange={setRestaurantName}
            disabled={saving}
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
            disabled={saving}
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
              min="0"
              step="0.01"
              disabled={saving}
              className="block w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">Rating</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} star${star > 1 ? 's' : ''}`}
                aria-pressed={star === rating}
                disabled={saving}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-hidden"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoveredRating || rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </fieldset>

        <ImageUpload file={photo} onChange={setPhoto} disabled={saving} />

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            name="notes"
            id="notes"
            rows={3}
            disabled={saving}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Couldn't save this meal: {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!restaurantName.trim() || saving}
        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Add Meal'}
      </button>
    </form>
  );
}
