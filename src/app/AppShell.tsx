import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import { Banner, Dialog, TabBar, Toast, type IconName } from '../ui';
import { addMeal, deleteMeal, removePhoto, restoreMeal, subscribeToMeals, updateMeal } from '../services/mealService';
import { groupDishes, groupPlaces, placeKey, type Dish, type Place } from '../lib/dishes';
import { NO_FILTERS, type DishFilters } from '../lib/filterDishes';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { clearOfflineData, reloadApp } from '../lib/offlineData';
import { navigate, tabOf, useRoute, type Tab } from './router';
import { HomeScreen } from '../screens/HomeScreen';
import { DishesScreen } from '../screens/DishesScreen';
import { DishScreen } from '../screens/DishScreen';
import { PlacesScreen } from '../screens/PlacesScreen';
import { PlaceScreen } from '../screens/PlaceScreen';
import { MeScreen } from '../screens/MeScreen';
import { LogDishSheet, type LogSheetMode } from '../screens/LogDishSheet';
import type { Meal, MealInput } from '../types';

interface ToastState {
  id: number;
  message: string;
  tone: 'brand' | 'success' | 'info' | 'warning' | 'danger';
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}

interface AppShellProps {
  user: User;
  onLogout: () => Promise<void>;
}

export function AppShell({ user, onLogout }: AppShellProps) {
  const route = useRoute();
  const online = useOnlineStatus();

  /** null until the first snapshot (from the local cache when offline). */
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sheet, setSheet] = useState<LogSheetMode | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [filters, setFilters] = useState<DishFilters>(NO_FILTERS);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return subscribeToMeals(
      user.uid,
      (snapshot) => {
        setMeals(snapshot.meals);
        setPendingIds(snapshot.pendingIds);
        setLoadFailed(false);
      },
      (err) => {
        console.error('Error loading meals:', err);
        setLoadFailed(true);
      },
    );
  }, [user.uid, attempt]);

  const dishes = useMemo(() => (meals ? groupDishes(meals) : null), [meals]);
  const places = useMemo(() => (dishes ? groupPlaces(dishes) : []), [dishes]);
  const pendingKeys = useMemo(
    () => new Set((dishes ?? []).filter((d) => d.logs.some((m) => pendingIds.has(m.id))).map((d) => d.key)),
    [dishes, pendingIds],
  );

  const showToast = useCallback((t: Omit<ToastState, 'id'>, onExpire?: () => void) => {
    window.clearTimeout(toastTimer.current);
    const id = Date.now();
    setToast({ ...t, id });
    toastTimer.current = window.setTimeout(
      () => {
        setToast((current) => (current?.id === id ? null : current));
        onExpire?.();
      },
      t.actionLabel ? 6000 : 4000,
    );
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const openDish = (dish: Dish) => navigate({ name: 'dish', key: dish.key });
  const openPlace = (target: Place | Dish) => navigate({ name: 'place', key: 'restaurant' in target ? placeKey(target.restaurant) : target.key });
  const openLog = (mode: LogSheetMode = { kind: 'new' }) => setSheet(mode);

  const handleSave = async (input: MealInput) => {
    if (!sheet) return;
    if (sheet.kind === 'edit') {
      await updateMeal(sheet.meal, input, user.uid);
      setSheet(null);
      showToast({ message: 'Changes saved', tone: 'success' });
    } else {
      const saved = await addMeal(input, user.uid);
      setSheet(null);
      const key = groupDishes([saved])[0].key;
      showToast({
        message: `${saved.dishName} logged`,
        tone: 'brand',
        icon: 'plate',
        actionLabel: route.name === 'dish' ? undefined : 'View',
        onAction: () => {
          setToast(null);
          navigate({ name: 'dish', key });
        },
      });
    }
  };

  /** Delete now, offer Undo; the photos are only removed once the Undo window has passed. */
  const deleteWithUndo = async (toDelete: Meal[], message: string) => {
    try {
      await Promise.all(toDelete.map((m) => deleteMeal(m, { keepPhoto: true })));
    } catch (err) {
      console.error('Error deleting:', err);
      showToast({ message: "Couldn't delete. Try again.", tone: 'danger' });
      return;
    }
    let undone = false;
    showToast(
      {
        message,
        tone: 'info',
        icon: 'trash',
        actionLabel: 'Undo',
        onAction: () => {
          undone = true;
          setToast(null);
          void Promise.all(toDelete.map((m) => restoreMeal(m, user.uid))).catch((err) => {
            console.error('Error restoring:', err);
            showToast({ message: "Couldn't undo. The dish is gone.", tone: 'danger' });
          });
        },
      },
      () => {
        if (!undone) toDelete.forEach((m) => void removePhoto(m.imagePath));
      },
    );
  };

  const signOut = async () => {
    setConfirmingSignOut(false);
    setSigningOut(true);
    await onLogout();
    // Don't leave this account's meals and photos on the device for the next person.
    await clearOfflineData();
    reloadApp();
  };
  // Clearing the offline copy throws away changes that haven't synced, so ask first.
  const requestSignOut = () => (pendingIds.size > 0 ? setConfirmingSignOut(true) : void signOut());

  const firstName = user.displayName?.split(/\s+/)[0];
  const tab = tabOf(route);
  const dishByKey = (key: string) => dishes?.find((d) => d.key === key);
  const placeByKey = (key: string) => places.find((p) => p.key === key);

  let screen;
  switch (route.name) {
    case 'home':
      screen = (
        <HomeScreen
          firstName={firstName}
          dishes={dishes}
          placeCount={places.length}
          pendingKeys={pendingKeys}
          onOpenDish={openDish}
          onSeeAll={() => navigate({ name: 'dishes' })}
          onLog={() => openLog()}
        />
      );
      break;
    case 'dishes':
      screen = (
        <DishesScreen
          dishes={dishes ?? []}
          pendingKeys={pendingKeys}
          filters={filters}
          onFiltersChange={setFilters}
          onOpenDish={openDish}
          onLog={() => openLog()}
        />
      );
      break;
    case 'dish': {
      const dish = dishByKey(route.key);
      screen =
        dishes === null ? null : (
          <DishScreen
            dish={dish}
            pendingIds={pendingIds}
            onBack={() => navigate({ name: 'dishes' })}
            onOpenPlace={openPlace}
            onLogAgain={(d) => openLog({ kind: 'new', prefill: { dishName: d.name, restaurantName: d.restaurant, verdict: d.verdict, tweaks: d.tweaks } })}
            onEdit={(meal) => openLog({ kind: 'edit', meal })}
            onDeleteVisit={(meal) => {
              const last = (dish?.logs.length ?? 0) <= 1;
              if (last) navigate({ name: 'dishes' });
              void deleteWithUndo([meal], last ? `${meal.dishName} deleted` : 'Visit deleted');
            }}
            onDeleteDish={(d) => {
              navigate({ name: 'dishes' });
              void deleteWithUndo(d.logs, `${d.name} deleted`);
            }}
          />
        );
      break;
    }
    case 'places':
      screen = <PlacesScreen places={places} onOpenPlace={openPlace} onLog={() => openLog()} />;
      break;
    case 'place':
      screen =
        dishes === null ? null : (
          <PlaceScreen
            place={placeByKey(route.key)}
            pendingKeys={pendingKeys}
            onBack={() => navigate({ name: 'places' })}
            onOpenDish={openDish}
            onLogHere={(p) => openLog({ kind: 'new', prefill: { restaurantName: p.name } })}
          />
        );
      break;
    case 'me':
      screen = <MeScreen user={user} meals={meals ?? []} signingOut={signingOut} onSignOut={requestSignOut} onOpenDish={openDish} />;
      break;
  }

  return (
    <>
      <main className="app-main">
        {!online ? (
          <div style={{ paddingTop: 'calc(var(--space-3) + env(safe-area-inset-top))', marginBottom: 'calc(-1 * var(--space-3))' }}>
            <Banner tone="warning" title="You're offline" icon="info">
              You can still log and edit dishes. They'll sync when you're back online. Photos need a connection.
            </Banner>
          </div>
        ) : null}
        {loadFailed ? (
          <div style={{ paddingTop: 'var(--space-3)' }}>
            <Banner
              tone="danger"
              title="Couldn't load your dishes"
              actionLabel="Try again"
              onAction={() => {
                setLoadFailed(false);
                setAttempt((n) => n + 1);
              }}
            >
              Check your connection and try again.
            </Banner>
          </div>
        ) : null}
        {screen}
      </main>

      <div className="app-tabbar">
        <TabBar<Tab | 'log'>
          value={tab}
          onValueChange={(value) => value !== 'log' && navigate({ name: value })}
          items={[
            { value: 'home', label: 'Home', icon: 'home' },
            { value: 'dishes', label: 'Dishes', icon: 'utensils' },
            { value: 'log', label: 'Log a dish', fab: true, onClick: () => openLog() },
            { value: 'places', label: 'Places', icon: 'map-pin' },
            { value: 'me', label: 'Me', icon: 'user' },
          ]}
        />
      </div>

      {toast ? (
        <div className="app-toasts">
          <Toast key={toast.id} tone={toast.tone} icon={toast.icon} actionLabel={toast.actionLabel} onAction={toast.onAction}>
            {toast.message}
          </Toast>
        </div>
      ) : null}

      {sheet ? <LogDishSheet mode={sheet} dishes={dishes ?? []} onSave={handleSave} onClose={() => setSheet(null)} /> : null}

      {confirmingSignOut ? (
        <Dialog
          title="Sign out with unsynced changes?"
          icon="alert"
          tone="danger"
          confirmLabel="Sign out anyway"
          cancelLabel="Stay signed in"
          onConfirm={() => void signOut()}
          onCancel={() => setConfirmingSignOut(false)}
        >
          {pendingIds.size === 1 ? '1 change hasn’t' : `${pendingIds.size} changes haven’t`} reached the server yet. Signing out now will lose{' '}
          {pendingIds.size === 1 ? 'it' : 'them'}. Reconnect and wait for "Waiting to sync" to clear to keep {pendingIds.size === 1 ? 'it' : 'them'}.
        </Dialog>
      ) : null}
    </>
  );
}
