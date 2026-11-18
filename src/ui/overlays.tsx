import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cx } from './constants';
import { Button, IconButton } from './actions';

/** Close on Escape, lock page scroll, and move focus into the overlay while it's open. */
function useOverlay(onClose: (() => void) | undefined, panel: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the panel itself, not its first field, so phones don't pop the keyboard over the sheet.
    panel.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
    // Run once per open; onClose identity changes shouldn't refocus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

interface DialogProps {
  title: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  icon?: IconName;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Centered modal for a decision that needs an answer now. */
export function Dialog({ title, children, confirmLabel, cancelLabel = 'Cancel', tone = 'default', icon, onConfirm, onCancel }: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useOverlay(onCancel, panel);
  return (
    <div className="dl-overlay">
      <div className="dl-scrim" onClick={onCancel} />
      <div ref={panel} className="dl-dialog" role="dialog" aria-modal aria-labelledby={titleId} tabIndex={-1}>
        {icon ? (
          <span className={cx('dl-dialog-icon', tone === 'danger' && 'dl-dialog-icon-danger')} aria-hidden>
            <Icon name={icon} size={24} />
          </span>
        ) : null}
        <h2 className="title-md" id={titleId}>
          {title}
        </h2>
        {children ? <div className="body dl-muted dl-dialog-body">{children}</div> : null}
        <div className="dl-dialog-actions">
          <Button variant="ghost" onClick={onCancel} data-autofocus-skip>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface BottomSheetProps {
  title: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}

/** Slides up from the bottom for focused tasks like logging a dish. Centered panel on wide screens. */
export function BottomSheet({ title, children, footer, onClose }: BottomSheetProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useOverlay(onClose, panel);
  return (
    <div className="dl-overlay dl-overlay-sheet">
      <div className="dl-scrim" onClick={onClose} />
      <div ref={panel} className="dl-sheet" role="dialog" aria-modal aria-labelledby={titleId} tabIndex={-1}>
        <span className="dl-sheet-handle" aria-hidden />
        <div className="dl-sheet-head">
          <h2 className="title-md" id={titleId}>
            {title}
          </h2>
          <IconButton icon="x" label="Close" size="sm" variant="tonal" onClick={onClose} data-autofocus-skip />
        </div>
        <div className="dl-sheet-body">{children}</div>
        {footer ? <div className="dl-sheet-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export interface MenuItem {
  label: ReactNode;
  icon?: IconName;
  hint?: ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/** A "more" IconButton that opens a popover menu. Destructive items go last, after a divider. */
export function MenuButton({ items, label = 'More' }: { items: (MenuItem | '-')[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    wrapper.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="app-menu-anchor">
      <IconButton icon="more" label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen((o) => !o)} />
      {open ? (
        <div id={menuId} className="dl-menu app-menu-popover" role="menu" aria-label={label}>
          {items.map((it, i) =>
            it === '-' ? (
              <hr key={i} className="dl-menu-sep" />
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                className={cx('dl-menu-item body', it.danger && 'dl-menu-danger')}
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
              >
                {it.icon ? <Icon name={it.icon} size={20} /> : null}
                <span className="dl-menu-label">{it.label}</span>
                {it.hint ? <span className="caption dl-muted">{it.hint}</span> : null}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
