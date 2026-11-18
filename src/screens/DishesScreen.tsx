import { AppBar, Button, Chip, DishCard, EmptyState, SearchField, SegmentedControl, VERDICTS } from '../ui';
import { filterDishes, hasActiveFilters, NO_FILTERS, SORT_OPTIONS, type DishFilters } from '../lib/filterDishes';
import { dishFootnote, plural } from '../lib/format';
import type { Dish } from '../lib/dishes';
import type { Verdict } from '../types';

interface DishesScreenProps {
  dishes: Dish[];
  pendingKeys: Set<string>;
  filters: DishFilters;
  onFiltersChange: (filters: DishFilters) => void;
  onOpenDish: (dish: Dish) => void;
  onLog: () => void;
}

export function DishesScreen({ dishes, pendingKeys, filters, onFiltersChange, onOpenDish, onLog }: DishesScreenProps) {
  const shown = filterDishes(dishes, filters);
  const update = (changes: Partial<DishFilters>) => onFiltersChange({ ...filters, ...changes });
  const count = (v: Verdict) => dishes.filter((d) => d.verdict === v).length;

  return (
    <>
      <AppBar variant="large" title="Dishes" subtitle={dishes.length ? plural(dishes.length, 'dish', 'dishes') : undefined} />

      {dishes.length === 0 ? (
        <EmptyState
          title="No dishes yet"
          action={
            <Button iconLeft="plus" onClick={onLog}>
              Log a dish
            </Button>
          }
        >
          Every dish you log lands here, with how you'd order it next time.
        </EmptyState>
      ) : (
        <>
          <div className="app-stack">
            <SearchField value={filters.search} onValueChange={(search) => update({ search })} placeholder="Search dishes, places, tweaks" label="Search dishes" />
            <div className="app-chips" role="group" aria-label="Filter by verdict">
              {(Object.keys(VERDICTS) as Verdict[]).map((v) => (
                <Chip key={v} selected={filters.verdict === v} onSelectedChange={(on) => update({ verdict: on ? v : null })} count={count(v)}>
                  {VERDICTS[v].label}
                </Chip>
              ))}
            </div>
            <SegmentedControl label="Sort dishes" value={filters.sort} onValueChange={(sort) => update({ sort })} options={SORT_OPTIONS} />
          </div>

          {hasActiveFilters(filters) ? (
            <p className="caption dl-muted" aria-live="polite">
              Showing {shown.length} of {plural(dishes.length, 'dish', 'dishes')}.{' '}
              <button type="button" className="app-link caption" onClick={() => onFiltersChange({ ...NO_FILTERS, sort: filters.sort })}>
                Clear filters
              </button>
            </p>
          ) : null}

          {shown.length === 0 ? (
            <EmptyState title="Nothing matches" icon="search">
              Try a different word, or clear the filters.
            </EmptyState>
          ) : (
            <div className="app-grid-tiles">
              {shown.map((dish) => (
                <DishCard
                  key={dish.key}
                  name={dish.name}
                  restaurant={dish.restaurant}
                  photo={dish.photo}
                  rating={dish.rating}
                  verdict={dish.verdict}
                  tweaks={dish.tweaks}
                  footnote={dishFootnote(dish, pendingKeys.has(dish.key))}
                  onClick={() => onOpenDish(dish)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
