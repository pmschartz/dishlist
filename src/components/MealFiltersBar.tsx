import { Search, X } from 'lucide-react';
import { hasActiveFilters, NO_FILTERS, SORT_LABELS, type MealFilters, type MealSort } from '../lib/filterMeals';

interface MealFiltersBarProps {
  filters: MealFilters;
  onChange: (filters: MealFilters) => void;
  restaurants: string[];
  shownCount: number;
  totalCount: number;
}

const fieldClass =
  'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500';

export function MealFiltersBar({ filters, onChange, restaurants, shownCount, totalCount }: MealFiltersBarProps) {
  const update = (changes: Partial<MealFilters>) => onChange({ ...filters, ...changes });
  const filtered = hasActiveFilters(filters);

  return (
    <section aria-label="Search and filter meals" className="space-y-2">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            aria-label="Search meals"
            placeholder="Search dishes, restaurants, notes…"
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            className={`${fieldClass} w-full pl-9`}
          />
        </div>
        <select
          aria-label="Restaurant"
          value={filters.restaurant}
          onChange={(e) => update({ restaurant: e.target.value })}
          className={fieldClass}
        >
          <option value="">All restaurants</option>
          {restaurants.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort by"
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value as MealSort })}
          className={fieldClass}
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {filtered && (
        <p className="flex items-center gap-2 text-sm text-gray-600" aria-live="polite">
          Showing {shownCount} of {totalCount} meals
          <button
            onClick={() => onChange({ ...NO_FILTERS, sort: filters.sort })}
            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        </p>
      )}
    </section>
  );
}
