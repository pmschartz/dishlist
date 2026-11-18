import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cx } from './constants';
import { FAB, IconButton } from './actions';

interface AppBarProps {
  /** Omit on pages that carry their own big heading. */
  title?: ReactNode;
  variant?: 'default' | 'large';
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  leading?: ReactNode;
  actions?: ReactNode;
}

/** Top bar: `large` on top-level tabs, compact with a back button when drilled in. */
export function AppBar({ title, variant = 'default', eyebrow, subtitle, onBack, backLabel = 'Back', leading, actions }: AppBarProps) {
  const large = variant === 'large';
  return (
    <header className={cx('dl-appbar', large && 'dl-appbar-large')}>
      <div className="dl-appbar-row">
        {onBack ? <IconButton icon="arrow-left" label={backLabel} onClick={onBack} /> : (leading ?? null)}
        {!large && title ? <h1 className="dl-appbar-title title-sm">{title}</h1> : <span className="dl-appbar-spacer" />}
        <div className="dl-appbar-actions">{actions ?? null}</div>
      </div>
      {large ? (
        <div className="dl-appbar-big">
          {eyebrow ? <p className="overline dl-appbar-eyebrow">{eyebrow}</p> : null}
          <h1 className="display-lg">{title}</h1>
          {subtitle ? <p className="body dl-muted">{subtitle}</p> : null}
        </div>
      ) : null}
    </header>
  );
}

export interface TabBarItem<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  fab?: boolean;
  onClick?: () => void;
}

/** Bottom navigation around the center "Log a dish" FAB. */
export function TabBar<T extends string>({ items, value, onValueChange }: { items: TabBarItem<T>[]; value: T | null; onValueChange: (value: T) => void }) {
  return (
    <nav className="dl-tabbar" aria-label="Main">
      {items.map((it) => {
        if (it.fab) {
          return (
            <span key={it.value} className="dl-tabbar-fabslot">
              <FAB label={it.label} onClick={it.onClick} />
            </span>
          );
        }
        const on = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            className={cx('dl-tabbar-item', on && 'dl-tabbar-on')}
            aria-current={on ? 'page' : undefined}
            onClick={() => onValueChange(it.value)}
          >
            <span className="dl-tabbar-pill">{it.icon ? <Icon name={it.icon} size={24} /> : null}</span>
            <span className="dl-tabbar-label caption">{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

interface TabsProps<T extends string> {
  items: { value: T; label: ReactNode; count?: number }[];
  value: T;
  onValueChange: (value: T) => void;
  label: string;
}

/** Underlined tabs for sections of one page. */
export function Tabs<T extends string>({ items, value, onValueChange, label }: TabsProps<T>) {
  return (
    <div className="dl-tabs" role="tablist" aria-label={label}>
      {items.map((it) => {
        const on = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            className={cx('dl-tab label', on && 'dl-tab-on')}
            onClick={() => onValueChange(it.value)}
          >
            {it.label}
            {it.count !== undefined ? <span className="dl-tab-count caption">{it.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
