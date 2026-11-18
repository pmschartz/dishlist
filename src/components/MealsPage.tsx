import { useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { LogOut, UtensilsCrossed, WifiOff, X } from 'lucide-react';
import { MealForm } from './MealForm';
import { MealCard } from './MealCard';
import { MealFiltersBar } from './MealFiltersBar';
import { StatsView } from './StatsView';
import { addMeal, deleteMeal, subscribeToMeals, updateMeal } from '../services/mealService';
import { filterMeals, hasActiveFilters, NO_FILTERS, type MealFilters } from '../lib/filterMeals';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { clearOfflineData, reloadApp } from '../lib/offlineData';
import type { Meal, MealInput } from '../types';

interface MealsPageProps {
  user: User;
  onLogout: () => Promise<void>;
}

export function MealsPage({ user, onLogout }: MealsPageProps) {
  /** null until the first snapshot arrives (from the local cache when offline). */
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<MealFilters>(NO_FILTERS);
  const [view, setView] = useState<'meals' | 'stats'>('meals');
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const online = useOnlineStatus();

  const signOut = async () => {
    setSigningOut(true);
    await onLogout();
    // Don't leave this account's meals and photos on the device for the next person.
    await clearOfflineData();
    reloadApp();
  };

  // Clearing the offline copy throws away changes that haven't synced, so warn first.
  const requestSignOut = () => (pendingIds.size > 0 ? setConfirmingSignOut(true) : signOut());

  useEffect(() => {
    return subscribeToMeals(
      user.uid,
      (snapshot) => {
        setMeals(snapshot.meals);
        setPendingIds(snapshot.pendingIds);
      },
      (err) => {
        console.error('Error loading meals:', err);
        setLoadFailed(true);
      },
    );
  }, [user.uid, attempt]);

  const retryLoad = () => {
    setLoadFailed(false);
    setAttempt((n) => n + 1);
  };

  const allMeals = meals ?? [];
  // Look the meal up live, so a deletion elsewhere (another tab) ends edit mode.
  const editingMeal = allMeals.find((m) => m.id === editingId);
  const restaurants = [...new Set(allMeals.map((meal) => meal.restaurantName))].sort((a, b) => a.localeCompare(b));
  const shownMeals = filterMeals(allMeals, filters);

  /** Shown instead of the list or stats while loading, on error, or with no meals yet. */
  const listStatus = loadFailed ? (
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
    <p className="text-gray-500 text-center">
      {view === 'stats' ? 'Add a few meals to see your stats.' : 'No meals added yet. Start by adding your first meal!'}
    </p>
  ) : null;

  // The live subscription updates the list after every change, so these just write.
  const handleAddMeal = async (input: MealInput) => {
    await addMeal(input, user.uid);
  };

  const handleUpdateMeal = async (input: MealInput) => {
    if (!editingMeal) return;
    await updateMeal(editingMeal, input, user.uid);
    setEditingId(null);
  };

  const startEditing = (meal: Meal) => {
    setEditingId(meal.id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDeleteMeal = async (meal: Meal) => {
    try {
      await deleteMeal(meal);
      if (editingId === meal.id) setEditingId(null);
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
              onClick={requestSignOut}
              disabled={signingOut}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              {signingOut ? 'Signing out…' : 'Sign Out'}
            </button>
          </div>
        </header>

        {confirmingSignOut && (
          <div role="alertdialog" aria-labelledby="unsynced-warning" className="mb-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p id="unsynced-warning">
              {pendingIds.size === 1 ? '1 change hasn’t' : `${pendingIds.size} changes haven’t`} synced yet. Signing out
              now will discard {pendingIds.size === 1 ? 'it' : 'them'}. Reconnect and wait for "Waiting to sync" to clear
              to keep {pendingIds.size === 1 ? 'it' : 'them'}.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setConfirmingSignOut(false)}
                className="rounded-md bg-white px-3 py-1.5 font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Stay signed in
              </button>
              <button
                onClick={signOut}
                disabled={signingOut}
                className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Sign out anyway
              </button>
            </div>
          </div>
        )}

        {!online && (
          <div role="status" className="mb-6 flex items-start gap-3 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              You're offline. You can still add, edit and delete meals; changes are saved on this device and sync when
              you reconnect. Adding photos needs a connection.
            </span>
          </div>
        )}

        {error && (
          <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss" className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div role="tablist" aria-label="View" className="mb-6 inline-flex rounded-lg bg-gray-200 p-1">
          {(['meals', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={view === tab}
              onClick={() => {
                setView(tab);
                setEditingId(null);
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${
                view === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'meals' ? 'Meals' : 'Stats'}
            </button>
          ))}
        </div>

        {view === 'stats' ? (
          (listStatus ?? <StatsView meals={allMeals} />)
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div ref={formRef} className="lg:sticky lg:top-8 scroll-mt-8">
              {editingMeal ? (
                <MealForm
                  key={editingMeal.id}
                  meal={editingMeal}
                  onSubmit={handleUpdateMeal}
                  onCancel={() => setEditingId(null)}
                  restaurants={restaurants}
                />
              ) : (
                <MealForm key="new" onSubmit={handleAddMeal} restaurants={restaurants} />
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {listStatus ?? (
              <>
                <MealFiltersBar
                  filters={filters}
                  onChange={setFilters}
                  restaurants={restaurants}
                  shownCount={shownMeals.length}
                  totalCount={allMeals.length}
                />
                {shownMeals.length === 0 ? (
                  <div className="rounded-xl bg-white p-6 text-center shadow-lg">
                    <p className="text-gray-700">No meals match your search.</p>
                    {hasActiveFilters(filters) && (
                      <button
                        onClick={() => setFilters({ ...NO_FILTERS, sort: filters.sort })}
                        className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {shownMeals.map((meal) => (
                      <MealCard
                        key={meal.id}
                        meal={meal}
                        onDelete={handleDeleteMeal}
                        onEdit={startEditing}
                        isEditing={meal.id === editingId}
                        pendingSync={pendingIds.has(meal.id)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
