import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox } from './Combobox';

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="restaurant">Restaurant</label>
      <Combobox id="restaurant" options={['Luigi’s', 'Thai Palace', 'Taco Stand']} value={value} onChange={setValue} />
      <output>{value}</output>
    </>
  );
}

describe('Combobox', () => {
  it('uses typed text as the value, even for a new restaurant', async () => {
    render(<Harness />);
    await userEvent.type(screen.getByLabelText('Restaurant'), 'Brand New Diner');

    expect(screen.getByRole('status')).toHaveTextContent('Brand New Diner');
  });

  it('filters suggestions as you type and lets you pick one', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('Restaurant');
    await userEvent.type(input, 't');

    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Thai Palace', 'Taco Stand']);

    await userEvent.click(screen.getByRole('option', { name: 'Taco Stand' }));
    expect(input).toHaveValue('Taco Stand');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('can be cleared', async () => {
    render(<Harness initial="Luigi’s" />);
    const input = screen.getByLabelText('Restaurant');
    await userEvent.clear(input);

    expect(input).toHaveValue('');
    expect(screen.getByRole('status')).toHaveTextContent('');
  });

  it('closes the suggestions on Escape', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByLabelText('Restaurant'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
