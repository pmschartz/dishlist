import { AppBar, Badge, Button, DishPhoto, EmptyState, MenuButton, NoteCard, RatingScore, Verdict, VisitItem } from '../ui';
import { formatDate, formatPrice, timesOrdered } from '../lib/format';
import type { Dish } from '../lib/dishes';
import type { Meal } from '../types';

interface DishScreenProps {
  /** undefined when the dish no longer exists (deleted, or a stale link). */
  dish: Dish | undefined;
  pendingIds: Set<string>;
  onBack: () => void;
  onOpenPlace: (dish: Dish) => void;
  onLogAgain: (dish: Dish) => void;
  onEdit: (meal: Meal) => void;
  onDeleteVisit: (meal: Meal) => void;
  onDeleteDish: (dish: Dish) => void;
}

/**
 * One dish's page, in the order the product cares about: how much you liked it, whether to
 * order it again, how to order it next time, then the history.
 */
export function DishScreen({ dish, pendingIds, onBack, onOpenPlace, onLogAgain, onEdit, onDeleteVisit, onDeleteDish }: DishScreenProps) {
  if (!dish) {
    return (
      <>
        <AppBar title="Dish" onBack={onBack} />
        <EmptyState title="This dish isn't here anymore" icon="plate" action={<Button onClick={onBack}>Back to dishes</Button>}>
          It may have been deleted.
        </EmptyState>
      </>
    );
  }

  const latest = dish.latest;
  const several = dish.logs.length > 1;

  return (
    <>
      <AppBar
        title={dish.restaurant}
        onBack={onBack}
        actions={
          <MenuButton
            label="Dish actions"
            items={[
              { label: several ? 'Edit latest visit' : 'Edit dish', icon: 'edit', onClick: () => onEdit(latest) },
              { label: 'See the restaurant', icon: 'map-pin', onClick: () => onOpenPlace(dish) },
              '-',
              { label: several ? `Delete dish and ${dish.logs.length} visits` : 'Delete dish', icon: 'trash', danger: true, onClick: () => onDeleteDish(dish) },
            ]}
          />
        }
      />

      <DishPhoto src={dish.photo} alt={dish.name} icon="camera" iconSize={36} className="app-dish-photo" />

      <div className="app-dish-head">
        <div>
          <h1 className="title-lg">{dish.name}</h1>
          <div className="app-row">
            {dish.verdict ? <Verdict value={dish.verdict} stamp /> : null}
            {dish.price != null ? <Badge>{formatPrice(dish.price)}</Badge> : null}
            <Badge icon="repeat">{timesOrdered(dish.timesOrdered)}</Badge>
            {dish.logs.some((m) => pendingIds.has(m.id)) ? (
              <Badge tone="info" icon="clock">
                Waiting to sync
              </Badge>
            ) : null}
          </div>
        </div>
        <RatingScore value={dish.rating} size="lg" />
      </div>

      <NoteCard tweaks={dish.tweaks} onEdit={() => onEdit(latest)}>
        {dish.tweaks.length ? null : 'Nothing to change yet. Add a tweak like "No onions" so you remember how you like it.'}
      </NoteCard>

      <section className="app-section" aria-labelledby="history-heading">
        <h2 className="title-md" id="history-heading">
          Your history
        </h2>
        <div>
          {dish.logs.map((meal, i) => (
            <VisitItem
              key={meal.id}
              date={formatDate(meal.date)}
              dishes={[{ name: meal.dishName, rating: meal.rating }]}
              note={meal.notes || undefined}
              last={i === dish.logs.length - 1}
              actions={
                <MenuButton
                  label={`Actions for ${formatDate(meal.date)}`}
                  items={[
                    { label: 'Edit this visit', icon: 'edit', onClick: () => onEdit(meal) },
                    '-',
                    { label: 'Delete this visit', icon: 'trash', danger: true, onClick: () => onDeleteVisit(meal) },
                  ]}
                />
              }
            />
          ))}
        </div>
      </section>

      <div className="app-sticky-action">
        <Button size="lg" fullWidth iconLeft="repeat" onClick={() => onLogAgain(dish)}>
          Log it again
        </Button>
      </div>
    </>
  );
}
