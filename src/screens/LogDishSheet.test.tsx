import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const resized = new Blob(['small'], { type: 'image/jpeg' });
vi.mock('../lib/resizeImage', () => ({ resizeImage: vi.fn(async () => resized) }));
vi.mock('../lib/photoDate', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/photoDate')>()),
  readPhotoDate: vi.fn(async () => undefined),
}));

const goldenValley = { id: 'osm:W2', address: '6920 Wayzata Boulevard, Golden Valley', lat: 44.97, lon: -93.37 };
vi.mock('../lib/placeSearch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/placeSearch')>()),
  currentLocation: vi.fn(async () => ({ lat: 44.98, lon: -93.27 })),
  searchPlaces: vi.fn(async () => [{ name: 'Perkins', place: goldenValley, distanceKm: 8 }]),
}));

import { LogDishSheet } from './LogDishSheet';
import { readPhotoDate, toDayInput } from '../lib/photoDate';
import { groupDishes } from '../lib/dishes';
import type { Meal } from '../types';

const past: Meal[] = [
  {
    id: 'p1',
    restaurantName: 'Lotus Thai Kitchen',
    dishName: 'Pad see ew',
    rating: 5,
    verdict: 'again',
    tweaks: [{ kind: 'remove', text: 'No onions' }],
    imageUrl: '',
    notes: '',
    date: '2026-10-01T00:00:00.000Z',
  },
];
const dishes = groupDishes(past);

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

const field = (name: string) => screen.getByLabelText(name, { exact: false, selector: 'input, textarea' });

describe('LogDishSheet', () => {
  it('asks for a restaurant and dish before saving', async () => {
    const onSave = vi.fn();
    render(<LogDishSheet mode={{ kind: 'new' }} dishes={[]} onSave={onSave} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Save dish' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Pick a restaurant so we can file this dish.')).toBeInTheDocument();
    expect(screen.getByText('Name the dish so you can find it later.')).toBeInTheDocument();
  });

  it('saves everything: rating, verdict, tweaks, price, notes and the resized photo', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LogDishSheet mode={{ kind: 'new' }} dishes={[]} onSave={onSave} onClose={vi.fn()} />);

    await userEvent.type(field('Restaurant'), '  Bao Down ');
    await userEvent.type(field('Dish'), 'Pork belly bao');
    await userEvent.click(screen.getByRole('radio', { name: '4 out of 5, Good' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Order again' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add a tweak' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Add' }));
    await userEvent.type(field('Tweak'), 'Extra pickles{Enter}');
    await userEvent.upload(screen.getByLabelText('Choose a photo'), new File(['big'], 'bao.jpg', { type: 'image/jpeg' }));
    await userEvent.type(field('Price'), '9.50');
    await userEvent.type(field('Notes'), 'Crispy edges');
    await userEvent.click(screen.getByRole('button', { name: 'Save dish' }));

    expect(onSave).toHaveBeenCalledWith({
      restaurantName: 'Bao Down',
      dishName: 'Pork belly bao',
      rating: 4,
      verdict: 'again',
      tweaks: [{ kind: 'add', text: 'Extra pickles' }],
      notes: 'Crispy edges',
      price: 9.5,
      image: resized,
    });
  });

  it('lets you remove a tweak and clear a verdict by tapping it again', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <LogDishSheet
        mode={{ kind: 'new', prefill: { dishName: 'Pad see ew', restaurantName: 'Lotus Thai Kitchen', verdict: 'again', tweaks: [{ kind: 'remove', text: 'No onions' }] } }}
        dishes={dishes}
        onSave={onSave}
        onClose={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Remove tweak: No onions' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Order again' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save dish' }));

    expect(onSave.mock.calls[0][0]).toMatchObject({ tweaks: [], verdict: undefined, image: null, price: undefined });
  });

  it('fills in your verdict and tweaks from the last time you had the dish', async () => {
    render(<LogDishSheet mode={{ kind: 'new' }} dishes={dishes} onSave={vi.fn()} onClose={vi.fn()} />);

    await userEvent.type(field('Restaurant'), 'lotus thai kitchen');
    await userEvent.type(field('Dish'), 'PAD SEE EW');
    await userEvent.tab();

    expect(screen.getByText('Filled in from the last time you had Pad see ew.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Order again' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('No onions')).toBeInTheDocument();
  });

  it('suggests nearby restaurants and saves the one you pick', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LogDishSheet mode={{ kind: 'new' }} dishes={dishes} onSave={onSave} onClose={vi.fn()} />);

    await userEvent.type(field('Restaurant'), 'Perk');
    const option = await screen.findByRole('option', { name: /Perkins/ });
    expect(within(option).getByText('6920 Wayzata Boulevard, Golden Valley')).toBeInTheDocument();
    expect(within(option).getByText('5.0 mi')).toBeInTheDocument();
    await userEvent.click(option);

    expect(field('Restaurant')).toHaveValue('Perkins');
    expect(screen.getByText('6920 Wayzata Boulevard, Golden Valley')).toBeInTheDocument();
    await userEvent.type(field('Dish'), 'Pancakes');
    await userEvent.click(screen.getByRole('button', { name: 'Save dish' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ restaurantName: 'Perkins', place: goldenValley }));
  });

  it('offers places you have logged before, and picks one with the keyboard', async () => {
    render(<LogDishSheet mode={{ kind: 'new' }} dishes={dishes} onSave={vi.fn()} onClose={vi.fn()} />);

    await userEvent.type(field('Restaurant'), 'lot');
    expect(await screen.findByRole('option', { name: /Lotus Thai Kitchen/ })).toBeInTheDocument();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(field('Restaurant')).toHaveValue('Lotus Thai Kitchen');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('logs today unless you pick another day, and never a future one', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LogDishSheet mode={{ kind: 'new', prefill: { dishName: 'Bao', restaurantName: 'Bao Down' } }} dishes={[]} onSave={onSave} onClose={vi.fn()} />);
    expect(field('When')).toHaveValue(toDayInput(new Date()));

    await userEvent.clear(field('When'));
    await userEvent.type(field('When'), '2999-01-01');
    await userEvent.click(screen.getByRole('button', { name: 'Save dish' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("That's in the future. Pick the day you went.")).toBeInTheDocument();

    await userEvent.clear(field('When'));
    await userEvent.type(field('When'), '2026-11-12');
    await userEvent.click(screen.getByRole('button', { name: 'Save dish' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ date: new Date(2026, 10, 12, 12).toISOString() }));
  });

  it('saves no date for today, so the visit is stamped with the time you logged it', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LogDishSheet mode={{ kind: 'new', prefill: { dishName: 'Bao', restaurantName: 'Bao Down' } }} dishes={[]} onSave={onSave} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save dish' }));
    expect(onSave.mock.calls[0][0].date).toBeUndefined();
  });

  it('uses the day your photo was taken', async () => {
    const taken = new Date(2026, 10, 12, 19, 4);
    vi.mocked(readPhotoDate).mockResolvedValueOnce(taken);
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LogDishSheet mode={{ kind: 'new', prefill: { dishName: 'Bao', restaurantName: 'Bao Down' } }} dishes={[]} onSave={onSave} onClose={vi.fn()} />);

    await userEvent.upload(screen.getByLabelText('Choose a photo'), new File(['x'], 'bao.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByText("From your photo. Change it if that's not right.")).toBeInTheDocument();
    expect(field('When')).toHaveValue('2026-11-12');

    await userEvent.click(screen.getByRole('button', { name: 'Save dish' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ date: taken.toISOString() }));
  });

  it("offers the photo's date instead of overriding a day you already chose", async () => {
    vi.mocked(readPhotoDate).mockResolvedValueOnce(new Date(2026, 10, 12, 19, 4));
    render(<LogDishSheet mode={{ kind: 'new', prefill: { dishName: 'Bao', restaurantName: 'Bao Down' } }} dishes={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    await userEvent.clear(field('When'));
    await userEvent.type(field('When'), '2026-11-10');

    await userEvent.upload(screen.getByLabelText('Choose a photo'), new File(['x'], 'bao.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByText(/Your photo is from Nov 12/)).toBeInTheDocument();
    expect(field('When')).toHaveValue('2026-11-10');
    await userEvent.click(screen.getByRole('button', { name: 'Use that date' }));
    expect(field('When')).toHaveValue('2026-11-12');
  });

  it('rejects a price that is not a number', async () => {
    const onSave = vi.fn();
    render(<LogDishSheet mode={{ kind: 'new', prefill: { dishName: 'Bao', restaurantName: 'Bao Down' } }} dishes={[]} onSave={onSave} onClose={vi.fn()} />);

    await userEvent.type(field('Price'), 'eighteen');
    await userEvent.click(screen.getByRole('button', { name: 'Save dish' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Enter a price like 18 or 18.50.')).toBeInTheDocument();
  });

  it('keeps everything and shows the error if saving fails', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Photos can only be added while you’re online.'));
    render(<LogDishSheet mode={{ kind: 'new', prefill: { dishName: 'Bao', restaurantName: 'Bao Down' } }} dishes={[]} onSave={onSave} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Save dish' }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText("Couldn't save this dish")).toBeInTheDocument();
    expect(field('Dish')).toHaveValue('Bao');
    expect(screen.getByRole('button', { name: 'Save dish' })).toBeEnabled();
  });

  it('edits a meal: starts filled in, keeps the photo unless changed, and says Save changes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const meal: Meal = { ...past[0], imageUrl: 'https://x/photo.jpg', price: 16, notes: 'Great' };
    render(<LogDishSheet mode={{ kind: 'edit', meal }} dishes={dishes} onSave={onSave} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Edit dish' })).toBeInTheDocument();
    expect(field('Price')).toHaveValue('16');
    expect(screen.getByRole('radio', { name: '5 out of 5, Obsessed' })).toHaveAttribute('aria-checked', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSave.mock.calls[0][0]).toMatchObject({ dishName: 'Pad see ew', price: 16, notes: 'Great', image: undefined, date: meal.date });
  });

  it('removes the saved photo when asked', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<LogDishSheet mode={{ kind: 'edit', meal: { ...past[0], imageUrl: 'https://x/photo.jpg' } }} dishes={dishes} onSave={onSave} onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(onSave.mock.calls[0][0].image).toBeNull();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    render(<LogDishSheet mode={{ kind: 'new' }} dishes={[]} onSave={vi.fn()} onClose={onClose} />);

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
