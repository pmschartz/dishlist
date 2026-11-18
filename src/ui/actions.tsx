import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import { cx } from './constants';

export function Spinner({ size = 20, tone = 'brand', label = 'Loading' }: { size?: number; tone?: 'brand' | 'current'; label?: string }) {
  return (
    <span
      className={cx('dl-spinner', tone === 'current' && 'dl-spinner-current')}
      role="status"
      aria-label={label}
      style={{ width: size, height: size }}
    />
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  iconLeft?: IconName;
  iconRight?: IconName;
  fullWidth?: boolean;
  loading?: boolean;
}

/** Pill button. One primary per screen region; labels start with a verb, in sentence case. */
export function Button({
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  fullWidth,
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  const iconSize = size === 'sm' ? 16 : 20;
  return (
    <button
      type={type}
      {...rest}
      className={cx(
        'dl-btn label',
        `dl-btn-${variant}`,
        `dl-btn-${size}`,
        fullWidth && 'dl-btn-full',
        loading && 'dl-btn-loading',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <Spinner size={18} tone="current" label="Working" /> : iconLeft ? <Icon name={iconLeft} size={iconSize} /> : null}
      <span>{children}</span>
      {iconRight && !loading ? <Icon name={iconRight} size={iconSize} /> : null}
    </button>
  );
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Required accessible name, also shown as a tooltip. */
  label: string;
  variant?: 'ghost' | 'tonal' | 'secondary' | 'primary';
  size?: 'sm' | 'md';
}

export function IconButton({ icon, label, variant = 'ghost', size = 'md', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      className={cx('dl-iconbtn', `dl-iconbtn-${variant}`, `dl-iconbtn-${size}`, className)}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} size={size === 'sm' ? 18 : 22} />
    </button>
  );
}

interface FABProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  extended?: boolean;
  icon?: IconName;
}

/** The floating "Log a dish" button: tomato, inked outline, sticker shadow. */
export function FAB({ label = 'Log a dish', extended, icon = 'plus', className, type = 'button', ...rest }: FABProps) {
  return (
    <button
      type={type}
      {...rest}
      className={cx('dl-fab', extended && 'dl-fab-extended label', className)}
      aria-label={extended ? undefined : label}
    >
      <Icon name={icon} size={26} />
      {extended ? <span>{label}</span> : null}
    </button>
  );
}
