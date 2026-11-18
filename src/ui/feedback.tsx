import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cx } from './constants';
import { IconButton } from './actions';

const TONE_ICON: Record<string, IconName> = { info: 'info', success: 'check', warning: 'alert', danger: 'alert' };

interface ToastProps {
  children: ReactNode;
  tone?: 'brand' | 'success' | 'info' | 'warning' | 'danger';
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
}

/** Short past-tense confirmation, with an optional single action like Undo. */
export function Toast({ children, tone = 'success', icon, actionLabel, onAction }: ToastProps) {
  return (
    <div className={cx('dl-toast', `dl-toast-${tone}`)} role="status">
      <span className="dl-toast-icon">
        <Icon name={icon ?? TONE_ICON[tone] ?? 'check'} size={18} />
      </span>
      <span className="body dl-toast-msg">{children}</span>
      {actionLabel ? (
        <button type="button" className="dl-toast-action label" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

interface BannerProps {
  children?: ReactNode;
  title?: ReactNode;
  tone?: 'info' | 'success' | 'warning' | 'danger';
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

/** Inline message at the top of the content it's about. */
export function Banner({ children, title, tone = 'info', icon, actionLabel, onAction, onDismiss }: BannerProps) {
  return (
    <div className={cx('dl-banner', `dl-banner-${tone}`)} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={icon ?? TONE_ICON[tone]} size={20} className="dl-banner-icon" />
      <div className="dl-banner-text">
        {title ? <p className="body-strong">{title}</p> : null}
        {children ? <p className="body">{children}</p> : null}
        {actionLabel ? (
          <button type="button" className="dl-banner-action label" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>
      {onDismiss ? <IconButton icon="x" label="Dismiss" size="sm" onClick={onDismiss} className="dl-banner-x" /> : null}
    </div>
  );
}
