import { useState } from 'react';
import { CloudOff, Pencil, Star, Trash2 } from 'lucide-react';
import type { Meal } from '../types';

interface MealCardProps {
  meal: Meal;
  /** Delete the meal. Reject to keep the card and let the parent report the error. */
  onDelete: (meal: Meal) => Promise<void>;
  onEdit?: (meal: Meal) => void;
  /** This meal is open in the edit form. */
  isEditing?: boolean;
  /** Changes to this meal are saved on this device but not yet on the server. */
  pendingSync?: boolean;
}

const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function MealCard({ meal, onDelete, onEdit, isEditing, pendingSync }: MealCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formattedDate = new Date(meal.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(meal);
    } catch {
      // The parent shows the error; put the card back to normal.
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <article
      aria-label={meal.dishName}
      className={`bg-white rounded-xl shadow-lg overflow-hidden ${isEditing ? 'ring-2 ring-indigo-500' : ''}`}
    >
      {meal.imageUrl && (
        <div className="relative h-48">
          <img src={meal.imageUrl} alt={meal.dishName} loading="lazy" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{meal.dishName}</h3>
            <p className="text-sm text-gray-600">{meal.restaurantName}</p>
          </div>
          {!confirming && (
            <div className="flex shrink-0 gap-3">
              {onEdit && (
                <button
                  onClick={() => onEdit(meal)}
                  aria-label={`Edit ${meal.dishName}`}
                  className="text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  <Pencil className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setConfirming(true)}
                aria-label={`Delete ${meal.dishName}`}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {pendingSync && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
            <CloudOff className="h-3 w-3" />
            Waiting to sync
          </p>
        )}

        {confirming && (
          <div className="mt-4 flex items-center justify-between gap-2 rounded-md bg-red-50 px-3 py-2">
            <span className="text-sm text-red-700">Delete this meal?</span>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={deleting}
                className="rounded px-2 py-1 text-sm text-gray-700 hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded bg-red-600 px-2 py-1 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-1" role="img" aria-label={`Rated ${meal.rating} out of 5`}>
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${i < meal.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            />
          ))}
        </div>

        {meal.price != null && (
          <p className="mt-2 text-sm text-gray-600">Price: {priceFormat.format(meal.price)}</p>
        )}

        {meal.notes && <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{meal.notes}</p>}

        <p className="mt-4 text-xs text-gray-500">{formattedDate}</p>
      </div>
    </article>
  );
}
