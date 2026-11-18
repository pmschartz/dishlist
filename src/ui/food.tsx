import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { cx, TWEAK_KINDS } from './constants';
import { IconButton } from './actions';
import { RatingInput, RatingScore, Verdict } from './rating';
import type { Tweak, TweakKind, Verdict as VerdictValue } from '../types';

/** One customization to remember for next time. */
export function TweakChip({ kind, children, onRemove }: { kind: TweakKind; children: ReactNode; onRemove?: () => void }) {
  return (
    <span className={cx('dl-tweak', `dl-tweak-${kind}`, 'body-strong')}>
      <span className="dl-tweak-icon">
        <Icon name={TWEAK_KINDS[kind].icon} size={14} />
      </span>
      <span className="dl-tweak-text">{children}</span>
      {onRemove ? (
        <button type="button" className="dl-tweak-x" aria-label={`Remove tweak: ${children}`} onClick={onRemove}>
          <Icon name="x" size={14} />
        </button>
      ) : null}
    </span>
  );
}

/** The "Next time" sticky note. */
export function NoteCard({ tweaks, children, title = 'Next time', onEdit }: { tweaks?: Tweak[]; children?: ReactNode; title?: string; onEdit?: () => void }) {
  return (
    <section className="dl-note" aria-label={title}>
      <header className="dl-note-head">
        <span className="dl-note-title overline">
          <Icon name="note" size={16} />
          {title}
        </span>
        {onEdit ? <IconButton icon="edit" label="Edit next time" size="sm" onClick={onEdit} /> : null}
      </header>
      {tweaks?.length ? (
        <div className="dl-note-tweaks">
          {tweaks.map((t, i) => (
            <TweakChip key={i} kind={t.kind}>
              {t.text}
            </TweakChip>
          ))}
        </div>
      ) : null}
      {children ? <p className="dl-note-body body-lg">{children}</p> : null}
    </section>
  );
}

interface DishPhotoProps {
  src?: string;
  alt?: string;
  size?: number;
  icon?: IconName;
  iconSize?: number;
  className?: string;
  style?: CSSProperties;
}

/** The dish's photo, or the tomato polka-dot placeholder. */
export function DishPhoto({ src, alt, size, icon = 'plate', iconSize = 28, className, style }: DishPhotoProps) {
  const sized = { ...(size ? { width: size, height: size } : {}), ...style };
  if (src) return <img className={cx('dl-photo', className)} src={src} alt={alt ?? ''} style={sized} loading="lazy" />;
  return (
    <span className={cx('dl-photo dl-photo-empty', className)} style={sized} role="img" aria-label={alt ? `${alt}, no photo` : 'No photo yet'}>
      <Icon name={icon} size={iconSize} />
    </span>
  );
}

interface DishCardProps {
  name: string;
  restaurant?: string;
  photo?: string;
  rating?: number | null;
  verdict?: VerdictValue;
  tweaks?: Tweak[];
  footnote?: ReactNode;
  layout?: 'row' | 'tile';
  featured?: boolean;
  onClick?: () => void;
  className?: string;
}

/** A dish you've eaten: photo, name, restaurant, rating, verdict and tweaks. */
export function DishCard({ name, restaurant, photo, rating = null, verdict, tweaks = [], footnote, layout = 'row', featured, onClick, className }: DishCardProps) {
  const shown = tweaks.slice(0, layout === 'row' ? 1 : 2);
  const more = tweaks.length - shown.length;
  const Tag = onClick ? 'button' : 'article';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={onClick ? `${name}${restaurant ? ` at ${restaurant}` : ''}` : undefined}
      className={cx('dl-dish', `dl-dish-${layout}`, featured && 'dl-dish-featured', onClick && 'dl-dish-clickable', className)}
    >
      <DishPhoto src={photo} alt={name} className="dl-dish-photo" />
      <div className="dl-dish-body">
        <div className="dl-dish-top">
          <div className="dl-dish-titles">
            <h3 className="dl-dish-name title-sm">{name}</h3>
            {restaurant ? (
              <p className="dl-dish-place caption">
                <Icon name="map-pin" size={14} />
                {restaurant}
              </p>
            ) : null}
          </div>
          <RatingScore value={rating} size="sm" />
        </div>
        {verdict || shown.length ? (
          <div className="dl-dish-meta">
            {verdict ? <Verdict value={verdict} size="sm" /> : null}
            {shown.map((t, i) => (
              <TweakChip key={i} kind={t.kind}>
                {t.text}
              </TweakChip>
            ))}
            {more > 0 ? <span className="dl-dish-more caption">+{more} more</span> : null}
          </div>
        ) : null}
        {footnote ? <p className="dl-dish-foot caption">{footnote}</p> : null}
      </div>
    </Tag>
  );
}

interface RestaurantCardProps {
  name: string;
  subtitle?: string;
  visits: number;
  /** Best first. */
  dishes: { name: string; verdict?: VerdictValue; rating: number | null }[];
  limit?: number;
  onClick?: () => void;
}

/** A place, summarized by its dishes. Never an averaged restaurant score. */
export function RestaurantCard({ name, subtitle, visits, dishes, limit = 3, onClick }: RestaurantCardProps) {
  const again = dishes.filter((d) => d.verdict === 'again').length;
  const card = (
    <article className="dl-rest">
      <header className="dl-rest-head">
        <span className="dl-rest-mono title-md" aria-hidden>
          {(name || '?').charAt(0).toUpperCase()}
        </span>
        <div className="dl-rest-titles">
          <h3 className="title-md">{name}</h3>
          {subtitle ? <p className="caption dl-muted">{subtitle}</p> : null}
        </div>
        {onClick ? <Icon name="chevron-right" size={20} className="dl-muted" /> : null}
      </header>
      <div className="dl-rest-stats">
        <span className="dl-rest-stat">
          <strong className="title-sm">{dishes.length}</strong>
          <span className="caption dl-muted">{dishes.length === 1 ? 'dish logged' : 'dishes logged'}</span>
        </span>
        <span className="dl-rest-stat">
          <strong className="title-sm">{visits}</strong>
          <span className="caption dl-muted">{visits === 1 ? 'visit' : 'visits'}</span>
        </span>
        <span className="dl-rest-stat">
          <strong className="title-sm">{again}</strong>
          <span className="caption dl-muted">to order again</span>
        </span>
      </div>
      {dishes.length ? (
        <ul className="dl-rest-list">
          {dishes.slice(0, limit).map((d, i) => (
            <li key={i} className="dl-rest-row">
              <span className={cx('dl-rest-dot', `dl-dot-${d.verdict ?? 'none'}`)} aria-hidden />
              <span className="body-strong dl-rest-dish">{d.name}</span>
              {d.verdict ? <Verdict value={d.verdict} size="sm" /> : null}
              <RatingScore value={d.rating} size="sm" />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
  if (!onClick) return card;
  return (
    <button type="button" className="app-card-button" onClick={onClick} aria-label={name}>
      {card}
    </button>
  );
}

interface VisitItemProps {
  date: string;
  title?: ReactNode;
  dishes: { name: string; rating: number }[];
  note?: string;
  actions?: ReactNode;
  last?: boolean;
}

/** One visit on a timeline: when, and what you had, rated dish by dish. */
export function VisitItem({ date, title, dishes, note, actions, last }: VisitItemProps) {
  return (
    <div className={cx('dl-visit', last && 'dl-visit-last')}>
      <div className="dl-visit-rail" aria-hidden>
        <span className="dl-visit-dot" />
      </div>
      <div className="dl-visit-body">
        <div className="app-visit-head">
          <p className="overline dl-muted dl-visit-date">{date}</p>
          {actions}
        </div>
        {title ? <p className="body-strong">{title}</p> : null}
        <ul className="dl-visit-dishes">
          {dishes.map((d, i) => (
            <li key={i} className="dl-visit-dish">
              <span className="body">{d.name}</span>
              <RatingInput value={d.rating} readOnly size="sm" showLabel={false} />
            </li>
          ))}
        </ul>
        {note ? <p className="caption dl-muted dl-visit-note">“{note}”</p> : null}
      </div>
    </div>
  );
}
