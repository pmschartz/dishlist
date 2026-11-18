import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MealCard } from './MealCard';
import type { Meal } from '../types';

const meal: Meal = {
  id: 'meal-1',
  restaurantName: 'Luigi’s',
  dishName: 'Carbonara',
  rating: 3,
  imageUrl: '',
  notes: '',
  date: '2026-11-18T12:00:00.000Z',
};

describe('MealCard', () => {
  it('asks for confirmation before deleting', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<MealCard meal={meal} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete Carbonara' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Delete this meal?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(meal);
  });

  it('can cancel a delete', async () => {
    const onDelete = vi.fn();
    render(<MealCard meal={meal} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete Carbonara' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('Delete this meal?')).not.toBeInTheDocument();
  });

  it('goes back to normal if the delete fails', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('offline'));
    render(<MealCard meal={meal} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete Carbonara' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('button', { name: 'Delete Carbonara' })).toBeInTheDocument();
  });

  it('shows a $0 price, and no price line when there is none', () => {
    const { rerender } = render(<MealCard meal={{ ...meal, price: 0 }} onDelete={vi.fn()} />);
    expect(screen.getByText('Price: $0.00')).toBeInTheDocument();

    rerender(<MealCard meal={meal} onDelete={vi.fn()} />);
    expect(screen.queryByText(/Price:/)).not.toBeInTheDocument();
  });

  it('shows the rating', () => {
    render(<MealCard meal={meal} onDelete={vi.fn()} />);
    expect(screen.getByRole('img', { name: 'Rated 3 out of 5' })).toBeInTheDocument();
  });

  it('has an Edit button when editing is available', async () => {
    const onEdit = vi.fn();
    render(<MealCard meal={meal} onDelete={vi.fn()} onEdit={onEdit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit Carbonara' }));
    expect(onEdit).toHaveBeenCalledWith(meal);
  });

  it('shows when changes are waiting to sync', () => {
    const { rerender } = render(<MealCard meal={meal} onDelete={vi.fn()} pendingSync />);
    expect(screen.getByText('Waiting to sync')).toBeInTheDocument();

    rerender(<MealCard meal={meal} onDelete={vi.fn()} />);
    expect(screen.queryByText('Waiting to sync')).not.toBeInTheDocument();
  });
});
