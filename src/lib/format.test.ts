import { describe, expect, it } from 'vitest';
import { dishFootnote, formatDate, formatPrice, greeting, plural, timesOrdered } from './format';

const NOW = new Date(2026, 10, 18, 12);

describe('format', () => {
  it('shows dates as "Oct 12", adding the year only when it isn\'t this year', () => {
    expect(formatDate(new Date(2026, 9, 12).toISOString(), NOW)).toBe('Oct 12');
    expect(formatDate(new Date(2025, 9, 12).toISOString(), NOW)).toBe('Oct 12, 2025');
  });

  it('shows whole prices without cents', () => {
    expect(formatPrice(18)).toBe('$18');
    expect(formatPrice(18.5)).toBe('$18.50');
    expect(formatPrice(0)).toBe('$0');
  });

  it('pluralizes and counts orders', () => {
    expect(plural(1, 'dish', 'dishes')).toBe('1 dish');
    expect(plural(3, 'dish', 'dishes')).toBe('3 dishes');
    expect(timesOrdered(1)).toBe('Ordered once');
    expect(timesOrdered(3)).toBe('Ordered 3 times');
  });

  it('builds the dish card footnote', () => {
    const dish = { timesOrdered: 3, lastDate: new Date().toISOString() };
    expect(dishFootnote(dish)).toMatch(/^Ordered 3 times · last \w{3} \d{1,2}$/);
    expect(dishFootnote(dish, true)).toMatch(/ · Waiting to sync$/);
  });

  it('greets by time of day', () => {
    expect(greeting(new Date(2026, 0, 1, 9))).toBe('Good morning');
    expect(greeting(new Date(2026, 0, 1, 14))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 0, 1, 20))).toBe('Good evening');
  });
});
