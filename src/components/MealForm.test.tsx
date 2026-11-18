import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const resized = new Blob(['small jpeg'], { type: 'image/jpeg' });
vi.mock('../lib/resizeImage', () => ({ resizeImage: vi.fn(async () => resized) }));

import { MealForm } from './MealForm';
import type { Meal } from '../types';

async function fillIn() {
  await userEvent.type(screen.getByLabelText('Restaurant Name'), '  Luigi’s  ');
  await userEvent.type(screen.getByLabelText('Dish Name'), 'Carbonara');
  await userEvent.type(screen.getByLabelText('Price'), '0');
  await userEvent.click(screen.getByRole('button', { name: '4 stars' }));
  await userEvent.type(screen.getByLabelText('Notes'), 'Great sauce');
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

describe('MealForm', () => {
  it('disables Add Meal until a restaurant is entered', async () => {
    render(<MealForm onSubmit={vi.fn()} restaurants={[]} />);
    expect(screen.getByRole('button', { name: 'Add Meal' })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Restaurant Name'), '   ');
    expect(screen.getByRole('button', { name: 'Add Meal' })).toBeDisabled();
  });

  it('submits trimmed values, a $0 price and the resized photo, then resets', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<MealForm onSubmit={onSubmit} restaurants={[]} />);
    await fillIn();
    await userEvent.upload(screen.getByLabelText('Upload photo'), new File(['big'], 'dinner.jpg', { type: 'image/jpeg' }));

    await userEvent.click(screen.getByRole('button', { name: 'Add Meal' }));

    expect(onSubmit).toHaveBeenCalledWith({
      restaurantName: 'Luigi’s',
      dishName: 'Carbonara',
      rating: 4,
      notes: 'Great sauce',
      price: 0,
      image: resized,
    });
    expect(screen.getByLabelText('Restaurant Name')).toHaveValue('');
    expect(screen.getByLabelText('Dish Name')).toHaveValue('');
    expect(screen.queryByAltText('Selected photo preview')).not.toBeInTheDocument();
  });

  it('sends no price when the field is blank', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<MealForm onSubmit={onSubmit} restaurants={[]} />);
    await userEvent.type(screen.getByLabelText('Restaurant Name'), 'Luigi’s');
    await userEvent.type(screen.getByLabelText('Dish Name'), 'Carbonara');

    await userEvent.click(screen.getByRole('button', { name: 'Add Meal' }));

    expect(onSubmit.mock.calls[0][0]).toMatchObject({ price: undefined, image: null });
  });

  it('keeps everything filled in and shows the error when saving fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network unavailable'));
    render(<MealForm onSubmit={onSubmit} restaurants={[]} />);
    await fillIn();

    await userEvent.click(screen.getByRole('button', { name: 'Add Meal' }));

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't save this meal: Network unavailable");
    expect(screen.getByLabelText('Restaurant Name')).toHaveValue('  Luigi’s  ');
    expect(screen.getByLabelText('Dish Name')).toHaveValue('Carbonara');
    expect(screen.getByRole('button', { name: 'Add Meal' })).toBeEnabled();
  });
});

describe('MealForm in edit mode', () => {
  const meal: Meal = {
    id: 'meal-1',
    restaurantName: 'Luigi’s',
    dishName: 'Carbonara',
    rating: 4,
    notes: 'Great sauce',
    price: 18,
    imageUrl: 'https://storage.example/photo.jpg',
    imagePath: 'users/u/meals/meal-1.jpg',
    date: '2026-01-01T00:00:00.000Z',
  };

  it('starts filled in with the meal and its photo', () => {
    render(<MealForm meal={meal} onSubmit={vi.fn()} onCancel={vi.fn()} restaurants={[]} />);

    expect(screen.getByRole('heading', { name: 'Edit meal' })).toBeInTheDocument();
    expect(screen.getByLabelText('Restaurant Name')).toHaveValue('Luigi’s');
    expect(screen.getByLabelText('Dish Name')).toHaveValue('Carbonara');
    expect(screen.getByLabelText('Price')).toHaveValue(18);
    expect(screen.getByLabelText('Notes')).toHaveValue('Great sauce');
    expect(screen.getByRole('button', { name: '4 stars' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByAltText('Selected photo preview')).toHaveAttribute('src', meal.imageUrl);
  });

  it('keeps the saved photo (image undefined) when only text changes', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<MealForm meal={meal} onSubmit={onSubmit} onCancel={vi.fn()} restaurants={[]} />);

    const dish = screen.getByLabelText('Dish Name');
    await userEvent.clear(dish);
    await userEvent.type(dish, 'Cacio e Pepe');
    await userEvent.clear(screen.getByLabelText('Price'));
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSubmit).toHaveBeenCalledWith({
      restaurantName: 'Luigi’s',
      dishName: 'Cacio e Pepe',
      rating: 4,
      notes: 'Great sauce',
      price: undefined,
      image: undefined,
    });
  });

  it('sends image null after removing the saved photo', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<MealForm meal={meal} onSubmit={onSubmit} onCancel={vi.fn()} restaurants={[]} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
    expect(screen.queryByAltText('Selected photo preview')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSubmit.mock.calls[0][0].image).toBeNull();
  });

  it('sends the resized replacement photo', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<MealForm meal={meal} onSubmit={onSubmit} onCancel={vi.fn()} restaurants={[]} />);

    await userEvent.upload(screen.getByLabelText('Upload photo'), new File(['new'], 'new.jpg', { type: 'image/jpeg' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSubmit.mock.calls[0][0].image).toBe(resized);
  });

  it('cancels without saving', async () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<MealForm meal={meal} onSubmit={onSubmit} onCancel={onCancel} restaurants={[]} />);

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
