import { Star, Trash2 } from 'lucide-react';
import type { Meal } from '../types';

interface MealCardProps {
  meal: Meal;
  onDelete: (id: string) => void;
}

export function MealCard({ meal, onDelete }: MealCardProps) {
  const formattedDate = new Date(meal.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {meal.imageUrl && (
        <div className="relative h-48">
          <img
            src={meal.imageUrl}
            alt={meal.dishName}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{meal.dishName}</h3>
            <p className="text-sm text-gray-600">{meal.restaurantName}</p>
          </div>
          <button
            onClick={() => onDelete(meal.id)}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mt-4 flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${
                i < meal.rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>

        {meal.price && (
          <p className="mt-2 text-sm text-gray-600">
            Price: ${meal.price.toFixed(2)}
          </p>
        )}

        {meal.notes && (
          <p className="mt-2 text-sm text-gray-600">{meal.notes}</p>
        )}

        <p className="mt-4 text-xs text-gray-500">{formattedDate}</p>
      </div>
    </div>
  );
}