import { useState } from 'react';
import { AppBar, Button, DishCard, EmptyState, NoteCard, Tabs, VisitItem } from '../ui';
import { dishFootnote, formatDate, plural } from '../lib/format';
import type { Dish, Place } from '../lib/dishes';

interface PlaceScreenProps {
  place: Place | undefined;
  pendingKeys: Set<string>;
  onBack: () => void;
  onOpenDish: (dish: Dish) => void;
  onLogHere: (place: Place) => void;
}

/** A restaurant's page: what to order (and how) next time, its dishes, and your visits. */
export function PlaceScreen({ place, pendingKeys, onBack, onOpenDish, onLogHere }: PlaceScreenProps) {
  const [tab, setTab] = useState<'dishes' | 'visits'>('dishes');

  if (!place) {
    return (
      <>
        <AppBar title="Place" onBack={onBack} />
        <EmptyState title="This place isn't here anymore" icon="map-pin" action={<Button onClick={onBack}>Back to places</Button>}>
          Its dishes may have been deleted.
        </EmptyState>
      </>
    );
  }

  // Visits: everything logged here, grouped by day, newest first.
  const byDay = new Map<string, { date: string; items: { name: string; rating: number; notes: string }[] }>();
  for (const dish of place.dishes) {
    for (const meal of dish.logs) {
      const day = new Date(meal.date).toDateString();
      const entry = byDay.get(day) ?? { date: meal.date, items: [] };
      entry.items.push({ name: meal.dishName, rating: meal.rating, notes: meal.notes });
      byDay.set(day, entry);
    }
  }
  const visits = [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date));
  const usuals = place.dishes.filter((d) => d.verdict === 'again').map((d) => d.name);

  return (
    <>
      <AppBar onBack={onBack} backLabel="Back to places" />

      <div className="app-stack" style={{ gap: 'var(--space-1)' }}>
        <h1 className="title-lg">{place.name}</h1>
        <p className="body dl-muted">
          {plural(place.dishes.length, 'dish', 'dishes')} · {plural(place.visits, 'visit')} · last {formatDate(place.lastDate)}
        </p>
      </div>

      <NoteCard title="Next time here" tweaks={place.tweaks.map((t) => t.tweak)}>
        {usuals.length
          ? `Order again: ${usuals.join(', ')}.`
          : place.tweaks.length
            ? null
            : 'Mark a dish "Order again" or add a tweak, and it shows up here for your next visit.'}
      </NoteCard>

      <Tabs
        label="Place sections"
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'dishes', label: 'Dishes', count: place.dishes.length },
          { value: 'visits', label: 'Visits', count: visits.length },
        ]}
      />

      {tab === 'dishes' ? (
        <div className="app-stack" role="tabpanel" aria-label="Dishes">
          {place.dishes.map((dish) => (
            <DishCard
              key={dish.key}
              name={dish.name}
              photo={dish.photo}
              rating={dish.rating}
              verdict={dish.verdict}
              tweaks={dish.tweaks}
              footnote={dishFootnote(dish, pendingKeys.has(dish.key))}
              onClick={() => onOpenDish(dish)}
            />
          ))}
        </div>
      ) : (
        <div role="tabpanel" aria-label="Visits">
          {visits.map((visit, i) => (
            <VisitItem
              key={visit.date}
              date={formatDate(visit.date)}
              dishes={visit.items.map(({ name, rating }) => ({ name, rating }))}
              note={visit.items.map((it) => it.notes).filter(Boolean).join(' · ') || undefined}
              last={i === visits.length - 1}
            />
          ))}
        </div>
      )}

      <div className="app-sticky-action">
        <Button size="lg" fullWidth iconLeft="plus" onClick={() => onLogHere(place)}>
          Log a dish here
        </Button>
      </div>
    </>
  );
}
