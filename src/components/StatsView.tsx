import { useState } from 'react';
import { Star } from 'lucide-react';
import { computeStats, type MonthCount } from '../lib/mealStats';
import type { Meal } from '../types';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const formatMoney = (amount: number) => (amount >= 10000 ? compactCurrency : currency).format(amount);
const formatRating = (rating: number) => rating.toFixed(1);
const plural = (n: number, word: string) => `${n.toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;

export function StatsView({ meals }: { meals: Meal[] }) {
  const stats = computeStats(meals);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Meals logged" value={stats.totalMeals.toLocaleString('en-US')} />
        <StatTile label="Restaurants" value={stats.restaurantCount.toLocaleString('en-US')} />
        <StatTile
          label="Total spent"
          value={stats.totalSpent != null ? formatMoney(stats.totalSpent) : '—'}
          note={stats.totalSpent == null ? 'No prices yet' : undefined}
        />
        <StatTile
          label="Average rating"
          value={stats.averageRating != null ? `${formatRating(stats.averageRating)} / 5` : '—'}
          note={stats.averageRating == null ? 'No ratings yet' : undefined}
        />
      </div>

      <MonthlyChart months={stats.monthly} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl bg-white p-6 shadow-lg">
          <h2 className="text-base font-semibold text-gray-900">Top restaurants</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-2 font-medium">Restaurant</th>
                <th className="pb-2 text-right font-medium">Visits</th>
                <th className="pb-2 text-right font-medium">Avg rating</th>
                <th className="pb-2 text-right font-medium">Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 tabular-nums">
              {stats.topRestaurants.map((r) => (
                <tr key={r.name}>
                  <td className="py-2 pr-2 text-gray-900">{r.name}</td>
                  <td className="py-2 text-right text-gray-700">{r.visits}</td>
                  <td className="py-2 text-right text-gray-700">
                    {r.averageRating != null ? formatRating(r.averageRating) : '—'}
                  </td>
                  <td className="py-2 text-right text-gray-700">{r.spent != null ? formatMoney(r.spent) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl bg-white p-6 shadow-lg">
          <h2 className="text-base font-semibold text-gray-900">Top-rated dishes</h2>
          {stats.topDishes.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">Rate a meal to see your favorites here.</p>
          ) : (
            <ol className="mt-4 divide-y divide-gray-100">
              {stats.topDishes.map((meal) => (
                <li key={meal.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate text-gray-900">{meal.dishName}</span>
                    <span className="block truncate text-gray-500">{meal.restaurantName}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-gray-700" aria-label={`Rated ${meal.rating} out of 5`}>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden />
                    {meal.rating}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function StatTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-lg">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
    </div>
  );
}

const CHART_HEIGHT = 160;

function MonthlyChart({ months }: { months: MonthCount[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(...months.map((m) => m.count));
  // Label only the busiest month (latest if tied); the tooltip and table carry the rest.
  const peak = max > 0 ? months.map((m) => m.count).lastIndexOf(max) : -1;

  return (
    <section className="rounded-xl bg-white p-6 shadow-lg">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-base font-semibold text-gray-900">Meals per month</h2>
        <button
          onClick={() => setShowTable((shown) => !shown)}
          aria-expanded={showTable}
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          {showTable ? 'Show as chart' : 'Show as table'}
        </button>
      </div>

      {showTable ? (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="pb-2 font-medium">Month</th>
              <th className="pb-2 text-right font-medium">Meals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 tabular-nums">
            {months.map((m) => (
              <tr key={m.key}>
                <td className="py-1.5 text-gray-900">{m.longLabel}</td>
                <td className="py-1.5 text-right text-gray-700">{m.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-6" role="group" aria-label="Meals per month, last 12 months">
          <div className="relative flex items-end border-b border-gray-200" style={{ height: CHART_HEIGHT + 24 }}>
            {months.map((m, i) => {
              const height = max > 0 ? Math.round((m.count / max) * CHART_HEIGHT) : 0;
              const isActive = active === i;
              return (
                <div
                  key={m.key}
                  // The whole column slot is the hit target, not just the bar.
                  tabIndex={0}
                  aria-label={`${m.longLabel}: ${plural(m.count, 'meal')}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="relative flex h-full flex-1 flex-col items-center justify-end px-0.5 outline-none focus-visible:bg-indigo-50"
                >
                  {(i === peak || isActive) && m.count > 0 && (
                    <span className="mb-1 text-xs font-medium text-gray-700">{m.count}</span>
                  )}
                  <div
                    className={`w-full max-w-6 rounded-t ${isActive ? 'bg-indigo-700' : 'bg-indigo-500'}`}
                    style={{ height }}
                  />
                  {isActive && (
                    <div
                      role="tooltip"
                      // Anchor edge columns' tooltips inward so they stay inside the card.
                      className={`pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow ${
                        i < 2 ? 'left-0' : i >= months.length - 2 ? 'right-0' : ''
                      }`}
                    >
                      {m.longLabel}: {plural(m.count, 'meal')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex" aria-hidden>
            {months.map((m) => (
              <span key={m.key} className="flex-1 text-center text-xs text-gray-500">
                {m.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
