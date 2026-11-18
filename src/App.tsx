import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { UtensilsCrossed, LogOut, X } from 'lucide-react';
import { MealForm } from './components/MealForm';
import { MealCard } from './components/MealCard';
import { LoginPage } from './components/LoginPage';
import { useAuth } from './contexts/AuthContext';
import { addMeal, getMeals, deleteMeal } from './services/mealService';
import type { Meal, NewMeal } from './types';

export default function App() {
  const { user, logout } = useAuth();

  if (!user) {
    return <LoginPage />;
  }

  // Keyed by uid so a different account starts with fresh state.
  return <MealsPage key={user.uid} user={user} onLogout={logout} />;
}

function MealsPage({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  /** null while the first load is in flight. */
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMeals(user.uid)
      .then((loaded) => {
        if (!cancelled) setMeals(loaded);
      })
      .catch((err) => {
        console.error('Error loading meals:', err);
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user.uid, attempt]);

  const retryLoad = () => {
    setLoadFailed(false);
    setAttempt((n) => n + 1);
  };

  const restaurants = [...new Set((meals ?? []).map((meal) => meal.restaurantName))].sort((a, b) =>
    a.localeCompare(b),
  );

  const handleAddMeal = async (mealData: NewMeal) => {
    const newMeal = await addMeal(mealData, user.uid);
    setMeals((prev) => [newMeal, ...(prev ?? [])]);
  };

  const handleDeleteMeal = async (meal: Meal) => {
    try {
      await deleteMeal(meal);
      setMeals((prev) => (prev ?? []).filter((m) => m.id !== meal.id));
    } catch (err) {
      console.error('Error deleting meal:', err);
      setError(`Couldn't delete "${meal.dishName}". Please try again.`);
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Meal Tracker</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss" className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-8">
              <MealForm onSubmit={handleAddMeal} restaurants={restaurants} />
            </div>
          </div>

          <div className="lg:col-span-2">
            {loadFailed ? (
              <div role="alert" className="rounded-xl bg-white p-6 text-center shadow-lg">
                <p className="text-gray-700">Couldn't load your meals.</p>
                <button
                  onClick={retryLoad}
                  className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
                >
                  Try again
                </button>
              </div>
            ) : meals === null ? (
              <p className="text-gray-500 text-center" aria-live="polite">
                Loading your meals…
              </p>
            ) : meals.length === 0 ? (
              <p className="text-gray-500 text-center">No meals added yet. Start by adding your first meal!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {meals.map((meal) => (
                  <MealCard key={meal.id} meal={meal} onDelete={handleDeleteMeal} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
