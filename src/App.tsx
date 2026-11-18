import { useEffect, useState } from 'react';
import { UtensilsCrossed, LogOut } from 'lucide-react';
import { MealForm } from './components/MealForm';
import { MealCard } from './components/MealCard';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './contexts/AuthContext';
import { addMeal, getMeals, deleteMeal } from './services/mealService';
import type { Meal } from './types';

export default function App() {
  const { user, logout } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);

  useEffect(() => {
    if (user) {
      getMeals(user.uid).then(setMeals);
    }
  }, [user]);

  if (!user) {
    return <LoginPage />;
  }

  const restaurants = [...new Set(meals.map(meal => meal.restaurantName))];

  const handleAddMeal = async (mealData: Omit<Meal, 'id' | 'date'>) => {
    try {
      const newMeal = await addMeal(
        {
          ...mealData,
          date: new Date().toISOString(),
        },
        user.uid
      );
      setMeals(prev => [newMeal, ...prev]);
    } catch (error) {
      console.error('Error adding meal:', error);
    }
  };

  const handleDeleteMeal = async (id: string) => {
    try {
      await deleteMeal(id);
      setMeals(prev => prev.filter(meal => meal.id !== id));
    } catch (error) {
      console.error('Error deleting meal:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Meal Tracker</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <MealForm onSubmit={handleAddMeal} restaurants={restaurants} />
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {meals.length === 0 ? (
                <p className="text-gray-500 text-center col-span-full">
                  No meals added yet. Start by adding your first meal!
                </p>
              ) : (
                meals.map(meal => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    onDelete={handleDeleteMeal}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}