import { AppBar, Button, DishCard, EmptyState, Skeleton } from '../ui';
import { usuals, type Dish, type Place } from '../lib/dishes';
import { NearbyPlaces } from './NearbyPlaces';
import { dishFootnote, greeting, plural } from '../lib/format';

interface HomeScreenProps {
  firstName?: string;
  /** null while loading. */
  dishes: Dish[] | null;
  placeCount: number;
  /** Places you've logged; the ones with a saved location can show as "Near you". */
  places?: Place[];
  onOpenPlace?: (place: Place) => void;
  pendingKeys: Set<string>;
  onOpenDish: (dish: Dish) => void;
  onSeeAll: () => void;
  onLog: () => void;
}

export function HomeScreen({ firstName, dishes, placeCount, places = [], pendingKeys, onOpenDish, onOpenPlace, onSeeAll, onLog }: HomeScreenProps) {
  const eyebrow = firstName ? `${greeting()}, ${firstName}` : greeting();
  const subtitle = dishes?.length ? `${plural(dishes.length, 'dish', 'dishes')} at ${plural(placeCount, 'place')}` : undefined;

  if (dishes === null) {
    return (
      <>
        <AppBar variant="large" eyebrow={eyebrow} title="Your dishlist" />
        <section className="app-stack" aria-label="Loading your dishes" aria-busy>
          {[0, 1, 2].map((i) => (
            <div key={i} className="dl-dish dl-dish-row">
              <Skeleton shape="box" width={84} height={84} />
              <div className="app-stack" style={{ flex: 1, gap: 'var(--space-2)' }}>
                <Skeleton width="60%" />
                <Skeleton width="40%" />
                <Skeleton width="30%" />
              </div>
            </div>
          ))}
        </section>
      </>
    );
  }

  if (dishes.length === 0) {
    return (
      <>
        <AppBar variant="large" eyebrow={eyebrow} title="Your dishlist" />
        <EmptyState
          title="Ate something worth remembering?"
          action={
            <Button size="lg" iconLeft="plus" onClick={onLog}>
              Log your first dish
            </Button>
          }
        >
          Log what you ordered, rate it, and save how you'd order it next time.
        </EmptyState>
      </>
    );
  }

  const favorites = usuals(dishes);
  const favoriteKeys = new Set(favorites.map((d) => d.key));
  const recent = dishes.filter((d) => !favoriteKeys.has(d.key)).slice(0, 5);

  return (
    <>
      <AppBar variant="large" eyebrow={eyebrow} title="Your dishlist" subtitle={subtitle} />

      {onOpenPlace ? <NearbyPlaces places={places} onOpenPlace={onOpenPlace} /> : null}

      {favorites.length ? (
        <section className="app-section" aria-labelledby="usuals-heading">
          <div className="app-section-head">
            <h2 className="title-md" id="usuals-heading">
              Your usuals
            </h2>
          </div>
          <div className="app-stack">
            {favorites.map((dish, i) => (
              <DishCard
                key={dish.key}
                featured={i === 0}
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
        </section>
      ) : null}

      {recent.length ? (
        <section className="app-section" aria-labelledby="recent-heading">
          <div className="app-section-head">
            <h2 className="title-md" id="recent-heading">
              Recently logged
            </h2>
            <button type="button" className="app-link label" onClick={onSeeAll}>
              See all
            </button>
          </div>
          <div className="app-stack">
            {recent.map((dish) => (
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
        </section>
      ) : null}
    </>
  );
}
