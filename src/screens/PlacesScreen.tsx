import { useState } from 'react';
import { AppBar, Button, EmptyState, RestaurantCard, SearchField } from '../ui';
import { formatDate, plural } from '../lib/format';
import type { Place } from '../lib/dishes';

interface PlacesScreenProps {
  places: Place[];
  onOpenPlace: (place: Place) => void;
  onLog: () => void;
}

export function PlacesScreen({ places, onOpenPlace, onLog }: PlacesScreenProps) {
  const [search, setSearch] = useState('');
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = places.filter((p) => {
    const text = [p.name, ...p.dishes.map((d) => d.name)].join(' ').toLowerCase();
    return words.every((w) => text.includes(w));
  });

  return (
    <>
      <AppBar variant="large" title="Places" subtitle={places.length ? plural(places.length, 'place') : undefined} />

      {places.length === 0 ? (
        <EmptyState
          title="No places yet"
          icon="map-pin"
          action={
            <Button iconLeft="plus" onClick={onLog}>
              Log a dish
            </Button>
          }
        >
          Log a dish and its restaurant shows up here, summed up by what you ordered.
        </EmptyState>
      ) : (
        <>
          <SearchField value={search} onValueChange={setSearch} placeholder="Search places or dishes" label="Search places" />
          {shown.length === 0 ? (
            <EmptyState title="No places match" icon="search">
              Try a different word.
            </EmptyState>
          ) : (
            <div className="app-stack">
              {shown.map((place) => (
                <RestaurantCard
                  key={place.key}
                  name={place.name}
                  subtitle={`Last visit ${formatDate(place.lastDate)}`}
                  visits={place.visits}
                  dishes={place.dishes.map((d) => ({ name: d.name, verdict: d.verdict, rating: d.rating }))}
                  onClick={() => onOpenPlace(place)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
