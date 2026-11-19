import { useState } from 'react';
import { Icon } from './Icon';
import { cx, RATING_LABELS, VERDICTS } from './constants';
import type { Verdict as VerdictValue } from '../types';

interface RatingInputProps {
  /** 0 = unrated. */
  value: number;
  onValueChange?: (value: number) => void;
  size?: 'sm' | 'md';
  /** Shows a compact five-bar meter instead of buttons, for lists and timelines. */
  readOnly?: boolean;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

/** 1 to 5 as a numbered segmented scale, with the word for it alongside. */
export function RatingInput({ value, onValueChange, size = 'md', readOnly, showLabel = true, label = 'Rate this dish', className }: RatingInputProps) {
  const [hovered, setHovered] = useState(0);
  const sm = size === 'sm';
  const shown = readOnly ? value : hovered || value;
  const word = showLabel ? (
    <span className={cx('dl-rating-label', sm ? 'caption' : 'label', !shown && 'dl-rating-empty')}>
      {shown ? RATING_LABELS[shown] : readOnly ? 'Not rated' : 'Tap to rate'}
    </span>
  ) : null;

  if (readOnly) {
    return (
      <span
        className={cx('dl-rating', 'dl-rating-ro', sm && 'dl-rating-sm', className)}
        role="img"
        aria-label={value ? `${value} out of 5, ${RATING_LABELS[value]}` : 'Not rated'}
      >
        <span className="dl-meter" aria-hidden>
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={cx('dl-meter-bar', n <= value && 'dl-meter-on')} />
          ))}
        </span>
        {word}
      </span>
    );
  }

  return (
    <div className={cx('dl-rating', sm && 'dl-rating-sm', className)}>
      <div className="dl-scale" role="radiogroup" aria-label={label} onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = n <= value;
          const preview = !on && hovered > 0 && n <= hovered;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} out of 5, ${RATING_LABELS[n]}`}
              className={cx('dl-scale-step', 'label', on && 'dl-scale-on', preview && 'dl-scale-preview', value === n && 'dl-scale-current')}
              onMouseEnter={() => setHovered(n)}
              onFocus={() => setHovered(n)}
              onBlur={() => setHovered(0)}
              onClick={() => onValueChange?.(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
      {word}
    </div>
  );
}

/** Compact "4.5/5" badge. Unrated shows a dash, never a zero. */
export function RatingScore({ value, size = 'md', className }: { value: number | null; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const text = value == null ? '–' : String(Math.round(value * 10) / 10);
  return (
    <span
      className={cx('dl-score', `dl-score-${size}`, value == null && 'dl-score-none', className)}
      role="img"
      aria-label={value == null ? 'Not rated' : `${text} out of 5`}
    >
      <span className={cx('dl-score-num', size === 'lg' ? 'score' : size === 'md' ? 'title-sm' : 'label')}>{text}</span>
      {size !== 'sm' ? <span className="dl-score-of caption">/5</span> : null}
    </span>
  );
}

/** "Would I order this again?" Always icon + word. */
export function Verdict({ value, size = 'md', stamp, className }: { value: VerdictValue; size?: 'sm' | 'md'; stamp?: boolean; className?: string }) {
  const v = VERDICTS[value];
  return (
    <span
      className={cx(
        'dl-verdict',
        `dl-verdict-${value}`,
        size === 'sm' ? 'dl-verdict-sm caption' : 'label',
        stamp && 'dl-verdict-stamp',
        className,
      )}
    >
      <Icon name={v.icon} size={size === 'sm' ? 14 : 18} />
      {v.label}
    </span>
  );
}

interface VerdictPickerProps {
  value?: VerdictValue;
  onValueChange: (value: VerdictValue | undefined) => void;
  label?: string;
}

/** Three big tiles for choosing a verdict. Tap the chosen one again to clear it. */
export function VerdictPicker({ value, onValueChange, label = 'Would you order it again?' }: VerdictPickerProps) {
  return (
    <div className="dl-verdictpick" role="radiogroup" aria-label={label}>
      {(Object.keys(VERDICTS) as VerdictValue[]).map((k) => {
        const on = value === k;
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={on}
            className={cx('dl-verdictpick-item label', on && `dl-verdict-${k}`)}
            onClick={() => onValueChange(on ? undefined : k)}
          >
            <Icon name={VERDICTS[k].icon} size={18} />
            {VERDICTS[k].label}
          </button>
        );
      })}
    </div>
  );
}
