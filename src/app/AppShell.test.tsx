import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from 'firebase/auth';
import type { Meal } from '../types';
import type { MealsSnapshot } from '../services/mealService';

const service = vi.hoisted(() => ({
  subscribeToMeals: vi.fn(),
  addMeal: vi.fn(),
  updateMeal: vi.fn(),
  deleteMeal: vi.fn(),
  restoreMeal: vi.fn(),
  removePhoto: vi.fn(),
}));
vi.mock('../services/mealService', () => service);
vi.mock('../lib/resizeImage', () => ({ resizeImage: vi.fn() }));
const offline = vi.hoisted(() => ({ clearOfflineData: vi.fn(async () => {}), reloadApp: vi.fn() }));
vi.mock('../lib/offlineData', () => offline);

import { AppShell } from './AppShell';

const user = { uid: 'user-1', email: 'paige@example.com', displayName: 'Paige Wood', photoURL: null } as unknown as User;

const meals: Meal[] = [
  {
    id: 'a',
    restaurantName: 'Lotus Thai Kitchen',
    dishName: 'Pad see ew',
    rating: 5,
    verdict: 'again',
    tweaks: [{ kind: 'remove', text: 'No onions' }],
    imageUrl: '',
    imagePath: 'users/user-1/meals/a.jpg',
    notes: '',
    date: '2026-11-10T19:00:00.000Z',
  },
  {
    id: 'b',
    restaurantName: 'Bao Down',
    dishName: 'Pork belly bao',
    rating: 3,
    verdict: 'maybe',
    imageUrl: '',
    notes: '',
    date: '2026-11-01T19:00:00.000Z',
  },
];

let push: (snapshot: MealsSnapshot) => void;

beforeEach(() => {
  vi.clearAllMocks();
  window.location.hash = '';
  window.scrollTo = vi.fn();
  service.subscribeToMeals.mockImplementation((_uid: string, onChange: typeof push) => {
    push = onChange;
    onChange({ meals, pendingIds: new Set() });
    return vi.fn();
  });
  service.addMeal.mockImplementation(async (input) => ({ ...input, id: 'new', imageUrl: '', date: new Date().toISOString() }));
  service.updateMeal.mockResolvedValue(undefined);
  service.deleteMeal.mockResolvedValue(undefined);
  service.restoreMeal.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const renderShell = (onLogout = vi.fn().mockResolvedValue(undefined)) => render(<AppShell user={user} onLogout={onLogout} />);
const mainNav = () => screen.getByRole('navigation', { name: 'Main' });

describe('AppShell', () => {
  it('greets you and shows your usuals on Home', () => {
    renderShell();
    expect(screen.getByRole('heading', { name: 'Your dishlist' })).toBeInTheDocument();
    expect(screen.getByText(/, Paige$/)).toBeInTheDocument();
    expect(screen.getByText('2 dishes at 2 places')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Your usuals' })).getByRole('button', { name: 'Pad see ew at Lotus Thai Kitchen' })).toBeInTheDocument();
  });

  it('moves between tabs with the tab bar', async () => {
    renderShell();

    await userEvent.click(within(mainNav()).getByRole('button', { name: 'Places' }));
    expect(window.location.hash).toBe('#/places');
    expect(await screen.findByRole('heading', { name: 'Places' })).toBeInTheDocument();
    expect(within(mainNav()).getByRole('button', { name: 'Places' })).toHaveAttribute('aria-current', 'page');

    await userEvent.click(within(mainNav()).getByRole('button', { name: 'Me' }));
    expect(await screen.findByRole('heading', { name: 'Your numbers' })).toBeInTheDocument();
  });

  it('opens a dish and logs it again with your tweaks filled in', async () => {
    renderShell();

    await userEvent.click(screen.getByRole('button', { name: 'Pad see ew at Lotus Thai Kitchen' }));
    expect(window.location.hash).toBe(`#/dishes/${encodeURIComponent('lotus thai kitchen|pad see ew')}`);
    expect(await screen.findByRole('heading', { name: 'Pad see ew', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Next time' })).toHaveTextContent('No onions');

    await userEvent.click(screen.getByRole('button', { name: 'Log it again' }));
    const sheet = screen.getByRole('dialog', { name: 'Log a dish' });
    expect(within(sheet).getByLabelText('Dish')).toHaveValue('Pad see ew');
    expect(within(sheet).getByText('No onions')).toBeInTheDocument();

    await userEvent.click(within(sheet).getByRole('button', { name: 'Save dish' }));
    expect(service.addMeal).toHaveBeenCalledWith(expect.objectContaining({ dishName: 'Pad see ew', verdict: 'again' }), 'user-1');
    expect(await screen.findByText('Pad see ew logged')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays on the dish after an edit that renames it, instead of calling it deleted', async () => {
    renderShell();
    await userEvent.click(screen.getByRole('button', { name: 'Pad see ew at Lotus Thai Kitchen' }));
    const before = window.location.hash;

    await userEvent.click(screen.getByRole('button', { name: 'Dish actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Edit dish' }));
    const sheet = screen.getByRole('dialog', { name: 'Edit dish' });
    await userEvent.clear(within(sheet).getByLabelText('Dish'));
    await userEvent.type(within(sheet).getByLabelText('Dish'), 'Pad kee mao');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save changes' }));

    // The live update arrives with the renamed meal.
    act(() => push({ meals: meals.map((m) => (m.id === 'a' ? { ...m, dishName: 'Pad kee mao' } : m)), pendingIds: new Set() }));

    expect(window.location.hash).toBe(`#/dishes/${encodeURIComponent('lotus thai kitchen|pad kee mao')}`);
    expect(await screen.findByRole('heading', { name: 'Pad kee mao', level: 1 })).toBeInTheDocument();
    expect(screen.queryByText("This dish isn't here anymore")).not.toBeInTheDocument();
    expect(before).not.toBe(window.location.hash);
  });

  it('logs a new dish from the tab bar button and offers to view it', async () => {
    renderShell();

    await userEvent.click(within(mainNav()).getByRole('button', { name: 'Log a dish' }));
    const sheet = screen.getByRole('dialog', { name: 'Log a dish' });
    await userEvent.type(within(sheet).getByLabelText('Restaurant'), 'Sunny Side Diner');
    await userEvent.type(within(sheet).getByLabelText('Dish'), 'Breakfast burrito');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save dish' }));

    const toast = await screen.findByText('Breakfast burrito logged');
    await userEvent.click(within(toast.closest('.dl-toast') as HTMLElement).getByRole('button', { name: 'View' }));
    expect(window.location.hash).toBe(`#/dishes/${encodeURIComponent('sunny side diner|breakfast burrito')}`);
  });

  it('deletes a dish with Undo, keeping the photo until the undo window passes', async () => {
    renderShell();
    window.location.hash = `#/dishes/${encodeURIComponent('lotus thai kitchen|pad see ew')}`;
    await screen.findByRole('heading', { name: 'Pad see ew', level: 1 });

    await userEvent.click(screen.getByRole('button', { name: 'Dish actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete dish' }));

    expect(service.deleteMeal).toHaveBeenCalledWith(meals[0], { keepPhoto: true });
    expect(window.location.hash).toBe('#/dishes');
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(service.restoreMeal).toHaveBeenCalledWith(meals[0], 'user-1');
    expect(service.removePhoto).not.toHaveBeenCalled();
  });

  it('removes the photo once a delete is no longer undoable', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const ue = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderShell();
    window.location.hash = `#/dishes/${encodeURIComponent('lotus thai kitchen|pad see ew')}`;
    await screen.findByRole('heading', { name: 'Pad see ew', level: 1 });

    await ue.click(screen.getByRole('button', { name: 'Dish actions' }));
    await ue.click(screen.getByRole('menuitem', { name: 'Delete dish' }));
    await screen.findByRole('button', { name: 'Undo' });
    await act(async () => {
      vi.advanceTimersByTime(6500);
    });

    expect(service.removePhoto).toHaveBeenCalledWith('users/user-1/meals/a.jpg');
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('shows an offline banner while disconnected', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    renderShell();
    expect(screen.getByText("You're offline")).toBeInTheDocument();
  });

  it('offers to retry when your dishes fail to load', async () => {
    service.subscribeToMeals.mockImplementationOnce((_uid, _onChange, onError: (e: Error) => void) => {
      onError(new Error('permission-denied'));
      return vi.fn();
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    renderShell();

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(service.subscribeToMeals).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Couldn't load your dishes")).not.toBeInTheDocument();
  });

  it('warns before signing out with unsynced changes, then clears offline data', async () => {
    const onLogout = vi.fn().mockResolvedValue(undefined);
    renderShell(onLogout);
    act(() => push({ meals, pendingIds: new Set(['a']) }));
    window.location.hash = '#/me';

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    const dialog = screen.getByRole('dialog', { name: 'Sign out with unsynced changes?' });
    expect(dialog).toHaveTextContent('1 change hasn’t reached the server yet');
    expect(onLogout).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Sign out anyway' }));
    expect(onLogout).toHaveBeenCalled();
    expect(offline.clearOfflineData).toHaveBeenCalled();
    expect(offline.reloadApp).toHaveBeenCalled();
  });

  it('signs straight out when everything has synced', async () => {
    const onLogout = vi.fn().mockResolvedValue(undefined);
    renderShell(onLogout);
    window.location.hash = '#/me';

    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onLogout).toHaveBeenCalled();
  });
});
