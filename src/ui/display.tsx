import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cx } from './constants';

type Tone = 'neutral' | 'tomato' | 'tangerine' | 'yolk' | 'basil' | 'danger' | 'info';

/** Small read-only label for facts: price, "New", sync status. */
export function Badge({ children, tone = 'neutral', solid, icon }: { children: ReactNode; tone?: Tone; solid?: boolean; icon?: IconName }) {
  return (
    <span className={cx('dl-badge caption', `dl-badge-${tone}`, solid && 'dl-badge-solid')}>
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </span>
  );
}

export function Avatar({ name, src, size = 40, tone = 'tomato' }: { name?: string; src?: string; size?: number; tone?: 'tomato' | 'tangerine' | 'yolk' | 'basil' | 'neutral' }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4) };
  if (src) return <img className="dl-avatar" src={src} alt={name ?? ''} style={style} referrerPolicy="no-referrer" />;
  const initials = (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join('');
  return (
    <span className={cx('dl-avatar', `dl-avatar-${tone}`)} style={style} role="img" aria-label={name}>
      {initials || <Icon name="user" size={Math.round(size * 0.5)} />}
    </span>
  );
}

interface ListItemProps {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  leading?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
}

/** Full-width row for settings and simple lists. */
export function ListItem({ title, subtitle, icon, leading, trailing, onClick }: ListItemProps) {
  const Tag = onClick ? 'button' : 'div';
  const trail = trailing === undefined && onClick ? <Icon name="chevron-right" size={20} className="dl-muted" /> : trailing;
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} className={cx('dl-li', onClick && 'dl-li-clickable')}>
      {icon ? (
        <span className="dl-li-icon">
          <Icon name={icon} size={20} />
        </span>
      ) : (
        (leading ?? null)
      )}
      <span className="dl-li-text">
        <span className="body-strong">{title}</span>
        {subtitle ? <span className="caption dl-muted">{subtitle}</span> : null}
      </span>
      {trail ? <span className="dl-li-trail">{trail}</span> : null}
    </Tag>
  );
}

/** Friendly placeholder for an empty screen, always with a way forward. */
export function EmptyState({ title, children, icon = 'plate', action }: { title: ReactNode; children?: ReactNode; icon?: IconName; action?: ReactNode }) {
  return (
    <div className="dl-empty">
      <span className="dl-empty-art" aria-hidden>
        <Icon name={icon} size={36} />
      </span>
      <h3 className="title-md">{title}</h3>
      {children ? <p className="body dl-muted">{children}</p> : null}
      {action ?? null}
    </div>
  );
}

export function Skeleton({ shape = 'line', width, height }: { shape?: 'line' | 'box' | 'circle'; width?: number | string; height?: number | string }) {
  return <span className={cx('dl-skel', `dl-skel-${shape}`)} aria-hidden style={{ width, height }} />;
}
