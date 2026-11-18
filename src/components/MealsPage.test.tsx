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
}));
vi.mock('../services/mealService', () => service);
vi.mock('../lib/resizeImage', () => ({ resizeImage: vi.fn() }));

import { MealsPage } from './MealsPage';

const user = { uid: 'user-1', email: 'me@example.com' } as User;

const meals: Meal[] = [
  {
    id: 'a',
    restaurantName: 'Thai Palace',
    dishName: 'Pad Thai',
    rating: 4,
    notes: '',
    imageUrl: '',
    date: '2026-05-01T00:00:00.000Z',
  },
  {
    id: 'b',
    restaurantName: 'Luigi’s',
    dishName: 'Carbonara',
    rating: 5,
    notes: '',
    price: 18,
    imageUrl: '',
    date: '2026-03-01T00:00:00.000Z',
  },
];

let pushSnapshot: (snapshot: MealsSnapshot) => void;

beforeEach(() => {
  service.subscribeToMeals.mockImplementation((_uid: string, onChange: typeof pushSnapshot) => {
    pushSnapshot = onChange;
    onChange({ meals, pendingIds: new Set(['b']) });
    return vi.fn();
  });
  service.updateMeal.mockResolvedValue(undefined);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const cardTitles = () => screen.getAllByRole('article').map((card) => within(card).getByRole('heading').textContent);

describe('MealsPage', () => {
  it('shows the live list and which meals are waiting to sync', () => {
    render(<MealsPage user={user} onLogout={vi.fn()} />);

    expect(cardTitles()).toEqual(['Pad Thai', 'Carbonara']);
    expect(within(screen.getByRole('article', { name: 'Carbonara' })).getByText('Waiting to sync')).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: 'Pad Thai' })).queryByText('Waiting to sync')).toBeNull();
  });

  it('searches, filters by restaurant, and clears filters', async () => {
    render(<MealsPage user={user} onLogout={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Search meals'), 'carb');
    expect(cardTitles()).toEqual(['Carbonara']);
    expect(screen.getByText(/Showing 1 of 2 meals/)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Search meals'));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Restaurant' }), 'Thai Palace');
    expect(cardTitles()).toEqual(['Pad Thai']);

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(cardTitles()).toEqual(['Pad Thai', 'Carbonara']);
  });

  it('says when nothing matches', async () => {
    render(<MealsPage user={user} onLogout={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('Search meals'), 'sushi');

    expect(screen.getByText('No meals match your search.')).toBeInTheDocument();
  });

  it('edits a meal in the form and goes back to adding afterwards', async () => {
    render(<MealsPage user={user} onLogout={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit Carbonara' }));
    const form = screen.getByRole('form', { name: 'Edit meal' });
    expect(within(form).getByLabelText('Dish Name')).toHaveValue('Carbonara');

    await userEvent.type(within(form).getByLabelText('Notes'), 'Best in town');
    await userEvent.click(within(form).getByRole('button', { name: 'Save Changes' }));

    expect(service.updateMeal).toHaveBeenCalledWith(
      meals[1],
      expect.objectContaining({ dishName: 'Carbonara', notes: 'Best in town', image: undefined }),
      'user-1',
    );
    expect(await screen.findByRole('form', { name: 'Add a meal' })).toBeInTheDocument();
  });

  it('leaves edit mode if the meal is deleted elsewhere', async () => {
    render(<MealsPage user={user} onLogout={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Carbonara' }));

    act(() => pushSnapshot({ meals: [meals[0]], pendingIds: new Set() }));

    expect(screen.getByRole('form', { name: 'Add a meal' })).toBeInTheDocument();
  });

  it('shows an offline banner while disconnected', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<MealsPage user={user} onLogout={vi.fn()} />);

    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
  });

  it('offers to retry when the meals fail to load', async () => {
    service.subscribeToMeals.mockImplementationOnce((_uid, _onChange, onError: (e: Error) => void) => {
      onError(new Error('permission-denied'));
      return vi.fn();
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<MealsPage user={user} onLogout={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(service.subscribeToMeals).toHaveBeenCalledTimes(2);
    expect(cardTitles()).toEqual(['Pad Thai', 'Carbonara']);
  });
});
