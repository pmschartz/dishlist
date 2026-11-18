import type { IconName } from './icons';
import type { TweakKind, Verdict } from '../types';

/** Join class names, skipping falsy ones. */
export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/** 1 Nope · 2 Meh · 3 Fine · 4 Good · 5 Obsessed. The plate, not the star, is the unit. */
export const RATING_LABELS = ['', 'Nope', 'Meh', 'Fine', 'Good', 'Obsessed'];

export const VERDICTS: Record<Verdict, { label: string; icon: IconName }> = {
  again: { label: 'Order again', icon: 'repeat' },
  maybe: { label: 'Maybe', icon: 'question' },
  skip: { label: 'Skip it', icon: 'skip' },
};

export const TWEAK_KINDS: Record<TweakKind, { icon: IconName; label: string }> = {
  remove: { icon: 'minus', label: 'Remove' },
  add: { icon: 'plus', label: 'Add' },
  swap: { icon: 'swap', label: 'Swap' },
  side: { icon: 'bowl', label: 'On the side' },
};
