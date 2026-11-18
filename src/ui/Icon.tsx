import type { CSSProperties } from 'react';
import { ICONS, type IconName } from './icons';
import { cx } from './constants';

export type { IconName };

interface IconProps {
  name: IconName;
  size?: number;
  /** Only when the icon stands alone and means something; otherwise it's hidden from screen readers. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 20, label, className, style }: IconProps) {
  return (
    <svg
      className={cx('dl-icon', className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === 'more' ? 3 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      style={style}
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

