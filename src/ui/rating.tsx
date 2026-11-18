import { useState } from 'react';
import { Icon } from './Icon';
import { cx, RATING_LABELS, VERDICTS } from './constants';
import type { Verdict as VerdictValue } from '../types';

function Plate({ filled, size }: { filled: boolean; size: number }) {
  return (
    <span className={cx('dl-plate', filled && 'dl-plate-on')} style={{ width: size, height: size }} aria-hidden>
      <span className="dl-plate-rim" />
    </span>
  );
}

interface RatingInputProps {
  /** 0 = unrated. */
  value: number;
  onValueChange?: (value: number) => void;
  size?: 'sm' | 'md';
  readOnly?: boolean;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export function RatingInput({ value, onValueChange, size = 'md', readOnly, showLabel = true, label = 'Rate this dish', className }: RatingInputProps) {
  const [hovered, setHovered] = useState(0);
  const px = size === 'sm' ? 22 : 34;
  const shown = readOnly ? value : hovered || value;
  return (
    <div className={cx('dl-rating', readOnly && 'dl-rating-ro', className)}>
      <div
        className="dl-rating-plates"
        role={readOnly ? 'img' : 'radiogroup'}
        aria-label={readOnly ? (value ? `${value} of 5 plates: ${RATING_LABELS[value]}` : 'Not rated') : label}
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((n) =>
          readOnly ? (
            <span key={n}>
              <Plate filled={n <= shown} size={px} />
            </span>
          ) : (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} plate${n > 1 ? 's' : ''}, ${RATING_LABELS[n]}`}
              className="dl-rating-btn"
              onMouseEnter={() => setHovered(n)}
              onClick={() => onValueChange?.(n)}
            >
              <Plate filled={n <= shown} size={px} />
            </button>
          ),
        )}
      </div>
      {showLabel ? (
        <span className={cx('dl-rating-label', size === 'sm' ? 'caption' : 'label', !shown && 'dl-rating-empty')}>
          {shown ? RATING_LABELS[shown] : readOnly ? 'Not rated' : 'Tap to rate'}
        </span>
      ) : null}
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
