import { useState } from 'react';
import type { User } from 'firebase/auth';
import { AppBar, Avatar, Button, EmptyState, ListItem, RatingScore } from '../ui';
import { computeStats, type MonthCount } from '../lib/mealStats';
import { formatPrice, plural } from '../lib/format';
import type { Dish } from '../lib/dishes';
import type { Meal } from '../types';

interface MeScreenProps {
  user: User;
  meals: Meal[];
  signingOut: boolean;
  onSignOut: () => void;
  onOpenDish: (dish: Dish) => void;
}

export function MeScreen({ user, meals, signingOut, onSignOut, onOpenDish }: MeScreenProps) {
  const stats = computeStats(meals);
  const name = user.displayName ?? user.email ?? 'You';

  return (
    <>
      <AppBar variant="large" title="Me" leading={<Avatar name={name} src={user.photoURL ?? undefined} size={40} />} subtitle={user.email ?? undefined} />

      {stats.totalLogs === 0 ? (
        <EmptyState title="Your stats live here" icon="sparkle">
          Log a few dishes to see how often you eat out, what you spend, and your favorites.
        </EmptyState>
      ) : (
        <>
          <section className="app-section" aria-labelledby="numbers-heading">
            <h2 className="title-md" id="numbers-heading">
              Your numbers
            </h2>
            <div className="app-grid-2">
              <Stat label="Dishes" value={stats.totalDishes.toLocaleString('en-US')} note={stats.totalLogs !== stats.totalDishes ? `${plural(stats.totalLogs, 'visit')} logged` : undefined} />
              <Stat label="Places" value={stats.placeCount.toLocaleString('en-US')} />
              <Stat label="To order again" value={stats.toOrderAgain.toLocaleString('en-US')} />
              <Stat
                label="Average rating"
                value={stats.averageRating != null ? `${(Math.round(stats.averageRating * 10) / 10).toFixed(1)}/5` : '–'}
                note={stats.averageRating == null ? 'No ratings yet' : undefined}
              />
              <Stat label="Spent" value={stats.totalSpent != null ? formatPrice(stats.totalSpent) : '–'} note={stats.totalSpent == null ? 'No prices yet' : 'On dishes with a price'} />
            </div>
          </section>

          <MonthlyChart months={stats.monthly} />

          {stats.topDishes.length ? (
            <section className="app-section" aria-labelledby="favorites-heading">
              <h2 className="title-md" id="favorites-heading">
                Your favorites
              </h2>
              <div className="app-card" style={{ padding: 'var(--space-2)', gap: 0 }}>
                {stats.topDishes.map((dish) => (
                  <ListItem
                    key={dish.key}
                    title={dish.name}
                    subtitle={dish.restaurant}
                    icon="utensils"
                    trailing={<RatingScore value={dish.rating} size="sm" />}
                    onClick={() => onOpenDish(dish)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="app-section" aria-labelledby="places-heading">
            <h2 className="title-md" id="places-heading">
              Where you go most
            </h2>
            <div className="app-card">
              <table className="app-table body">
                <thead>
                  <tr className="caption">
                    <th scope="col">Place</th>
                    <th scope="col" className="num">
                      Visits
                    </th>
                    <th scope="col" className="num">
                      Dishes
                    </th>
                    <th scope="col" className="num">
                      Spent
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topPlaces.map((p) => (
                    <tr key={p.name}>
                      <td className="body-strong">{p.name}</td>
                      <td className="num">{p.visits}</td>
                      <td className="num">{p.dishes}</td>
                      <td className="num">{p.spent != null ? formatPrice(p.spent) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="app-section" aria-labelledby="account-heading">
        <h2 className="title-md" id="account-heading">
          Account
        </h2>
        <div className="app-card">
          <p className="body dl-muted">Signed in as {user.email}. Your dishes are private to your account.</p>
          <Button variant="secondary" fullWidth loading={signingOut} onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="app-stat">
      <span className="caption dl-muted">{label}</span>
      <span className="title-lg">{value}</span>
      {note ? <span className="caption dl-muted">{note}</span> : null}
    </div>
  );
}

const CHART_HEIGHT = 150;

function MonthlyChart({ months }: { months: MonthCount[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(...months.map((m) => m.count));
  // Label only the busiest month (latest if tied); the tooltip and the table carry the rest.
  const peak = max > 0 ? months.map((m) => m.count).lastIndexOf(max) : -1;

  return (
    <section className="app-section" aria-labelledby="monthly-heading">
      <div className="app-section-head">
        <h2 className="title-md" id="monthly-heading">
          Dishes per month
        </h2>
        <button type="button" className="app-link label" aria-expanded={showTable} onClick={() => setShowTable((s) => !s)}>
          {showTable ? 'Show chart' : 'Show as table'}
        </button>
      </div>
      <div className="app-card">
        {showTable ? (
          <table className="app-table body">
            <thead>
              <tr className="caption">
                <th scope="col">Month</th>
                <th scope="col" className="num">
                  Dishes
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.key}>
                  <td>{m.longLabel}</td>
                  <td className="num">{m.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div role="group" aria-label="Dishes logged per month, last 12 months">
            <div className="app-chart">
              {months.map((m, i) => {
                const height = max > 0 ? Math.round((m.count / max) * CHART_HEIGHT) : 0;
                const isActive = active === i;
                return (
                  <div
                    key={m.key}
                    className="app-chart-slot"
                    data-active={isActive}
                    tabIndex={0}
                    aria-label={`${m.longLabel}: ${plural(m.count, 'dish', 'dishes')}`}
                    onMouseEnter={() => setActive(i)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  >
                    {(i === peak || isActive) && m.count > 0 ? <span className="app-chart-value caption">{m.count}</span> : null}
                    <span className="app-chart-bar" style={{ height }} />
                    {isActive ? (
                      <span className="app-chart-tip caption" role="tooltip" data-edge={i < 2 ? 'start' : i >= months.length - 2 ? 'end' : undefined}>
                        {m.longLabel}: {plural(m.count, 'dish', 'dishes')}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="app-chart-labels" aria-hidden>
              {months.map((m) => (
                <span key={m.key} className="caption">
                  {m.label.charAt(0)}
                  <span className="app-month-rest">{m.label.slice(1)}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
