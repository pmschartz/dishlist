import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DishCard, RatingInput, RatingScore, RestaurantCard, Verdict, VerdictPicker } from '.';

describe('Dishlist components', () => {
  it('RatingScore rounds to one decimal and shows a dash, never a zero, when unrated', () => {
    const { rerender } = render(<RatingScore value={4.666} />);
    expect(screen.getByRole('img', { name: '4.7 out of 5' })).toHaveTextContent('4.7/5');
    rerender(<RatingScore value={null} />);
    expect(screen.getByRole('img', { name: 'Not rated' })).toHaveTextContent('–');
  });

  it('RatingInput always shows the word, so a rating never relies on counting plates', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<RatingInput value={0} onValueChange={onChange} />);
    expect(screen.getByText('Tap to rate')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: '2 plates, Meh' }));
    expect(onChange).toHaveBeenCalledWith(2);

    rerender(<RatingInput value={5} readOnly />);
    expect(screen.getByRole('img', { name: '5 of 5 plates: Obsessed' })).toBeInTheDocument();
    expect(screen.getByText('Obsessed')).toBeInTheDocument();
  });

  it('Verdict pairs an icon with a word', () => {
    render(<Verdict value="skip" />);
    expect(screen.getByText('Skip it')).toBeInTheDocument();
  });

  it('VerdictPicker clears when the chosen tile is tapped again', async () => {
    const onChange = vi.fn();
    render(<VerdictPicker value="maybe" onValueChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Maybe' }));
    expect(onChange).toHaveBeenCalledWith(undefined);
    await userEvent.click(screen.getByRole('radio', { name: 'Order again' }));
    expect(onChange).toHaveBeenCalledWith('again');
  });

  it('DishCard shows one tweak in a row and counts the rest', () => {
    render(
      <DishCard
        name="Pad see ew"
        restaurant="Lotus"
        rating={5}
        verdict="again"
        tweaks={[
          { kind: 'remove', text: 'No onions' },
          { kind: 'add', text: 'Extra chili' },
        ]}
      />,
    );
    expect(screen.getByText('No onions')).toBeInTheDocument();
    expect(screen.queryByText('Extra chili')).not.toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
  });

  it('RestaurantCard sums a place up by its dishes, with no averaged score', () => {
    render(
      <RestaurantCard
        name="Lotus Thai Kitchen"
        visits={2}
        dishes={[
          { name: 'Pad see ew', verdict: 'again', rating: 5 },
          { name: 'Mango sticky rice', verdict: 'skip', rating: 2 },
        ]}
      />,
    );
    expect(screen.getByText('dishes logged').previousSibling).toHaveTextContent('2');
    expect(screen.getByText('to order again').previousSibling).toHaveTextContent('1');
    expect(screen.queryByText('3.5')).not.toBeInTheDocument();
  });
});
