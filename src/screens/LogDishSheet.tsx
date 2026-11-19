import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Banner,
  BottomSheet,
  Button,
  DishPhoto,
  IconButton,
  RatingInput,
  SegmentedControl,
  TextArea,
  TextField,
  TweakChip,
  TWEAK_KINDS,
  VerdictPicker,
} from '../ui';
import { resizeImage } from '../lib/resizeImage';
import { placeKey, type Dish } from '../lib/dishes';
import type { Meal, MealInput, PlaceRef, Tweak, TweakKind, Verdict } from '../types';
import { RestaurantField, type KnownPlace } from './RestaurantField';

export type LogSheetMode =
  /** A new log, optionally prefilled (e.g. "Log it again" from a dish page). */
  | { kind: 'new'; prefill?: { dishName?: string; restaurantName?: string; place?: PlaceRef; verdict?: Verdict; tweaks?: Tweak[] } }
  | { kind: 'edit'; meal: Meal };

interface LogDishSheetProps {
  mode: LogSheetMode;
  /** Every dish you've logged, for suggestions and "fill in from last time". */
  dishes: Dish[];
  /** Reject to keep the sheet open with the error shown. */
  onSave: (input: MealInput) => Promise<void>;
  onClose: () => void;
}

const TWEAK_PLACEHOLDERS: Record<TweakKind, string> = {
  remove: 'No onions',
  add: 'Extra chili crisp',
  swap: 'Rice for noodles',
  side: 'Sauce on the side',
};

const NOTES_MAX = 500;

export function LogDishSheet({ mode, dishes, onSave, onClose }: LogDishSheetProps) {
  const editing = mode.kind === 'edit' ? mode.meal : null;
  const prefill = mode.kind === 'new' ? mode.prefill : undefined;
  const formId = useId();
  const dishListId = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  const [dishName, setDishName] = useState(editing?.dishName ?? prefill?.dishName ?? '');
  const [restaurantName, setRestaurantName] = useState(editing?.restaurantName ?? prefill?.restaurantName ?? '');
  const [place, setPlace] = useState<PlaceRef | undefined>(editing ? editing.place : prefill?.place);
  const [rating, setRating] = useState(editing?.rating ?? 0);
  const [verdict, setVerdict] = useState<Verdict | undefined>(editing?.verdict ?? prefill?.verdict);
  const [tweaks, setTweaks] = useState<Tweak[]>(editing?.tweaks ?? prefill?.tweaks ?? []);
  const [price, setPrice] = useState(editing?.price != null ? String(editing.price) : '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [removedSavedPhoto, setRemovedSavedPhoto] = useState(false);
  const [adding, setAdding] = useState<{ kind: TweakKind; text: string } | null>(null);
  const [filledFrom, setFilledFrom] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** One entry per place you've logged (each picked Perkins separately), most recent first. */
  const knownPlaces = useMemo<KnownPlace[]>(() => {
    const seen = new Map<string, KnownPlace>();
    for (const d of dishes) if (!seen.has(d.placeKey)) seen.set(d.placeKey, { name: d.restaurant, place: d.place });
    return [...seen.values()];
  }, [dishes]);
  /** Search near the last place you logged when your location isn't shared. */
  const lastPlace = useMemo(() => dishes.find((d) => d.place)?.place, [dishes]);
  const fallbackNear = useMemo(() => (lastPlace ? { lat: lastPlace.lat, lon: lastPlace.lon } : undefined), [lastPlace]);

  /** Dishes at the restaurant in the field: the picked location, or by name if none was picked. */
  const dishesHere = (name: string, at?: PlaceRef) =>
    dishes.filter((d) => (at ? d.placeKey === at.id : placeKey(d.restaurant) === placeKey(name)));

  const dishSuggestions = useMemo(() => {
    const here = dishes.filter((d) => (place ? d.placeKey === place.id : placeKey(d.restaurant) === placeKey(restaurantName)));
    return [...new Set((here.length ? here : dishes).map((d) => d.name))].sort((a, b) => a.localeCompare(b));
  }, [dishes, restaurantName, place]);

  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);
  const shownPhoto = photoUrl ?? (editing && !removedSavedPhoto ? editing.imageUrl : '') ?? '';

  const dishError = showErrors && !dishName.trim() ? 'Name the dish so you can find it later.' : undefined;
  const restaurantError = showErrors && !restaurantName.trim() ? 'Pick a restaurant so we can file this dish.' : undefined;
  const priceNumber = price.trim() === '' ? undefined : Number(price);
  const priceError = showErrors && priceNumber !== undefined && (!Number.isFinite(priceNumber) || priceNumber < 0) ? 'Enter a price like 18 or 18.50.' : undefined;

  /** Typing a dish you've had before fills in how you ordered it last time. */
  const fillFromLastTime = (dish: string, restaurant: string, at: PlaceRef | undefined = place) => {
    if (editing || !dish.trim() || !restaurant.trim() || tweaks.length || verdict) return;
    const known = dishesHere(restaurant, at).find((d) => placeKey(d.name) === placeKey(dish));
    if (!known || (!known.tweaks.length && !known.verdict)) return;
    setTweaks(known.tweaks);
    setVerdict(known.verdict);
    setFilledFrom(known.name);
  };

  const addTweak = () => {
    if (!adding?.text.trim()) return;
    setTweaks((prev) => [...prev, { kind: adding.kind, text: adding.text.trim() }]);
    setAdding(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    if (!dishName.trim() || !restaurantName.trim() || (priceNumber !== undefined && (!Number.isFinite(priceNumber) || priceNumber < 0))) return;

    setSaving(true);
    setError(null);
    try {
      await onSave({
        dishName: dishName.trim(),
        restaurantName: restaurantName.trim(),
        place,
        rating,
        verdict,
        tweaks,
        notes: notes.trim(),
        price: priceNumber,
        image: photo ? await resizeImage(photo) : editing ? (removedSavedPhoto ? null : undefined) : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      title={editing ? 'Edit dish' : 'Log a dish'}
      onClose={onClose}
      footer={
        <Button type="submit" form={formId} size="lg" fullWidth loading={saving}>
          {editing ? 'Save changes' : 'Save dish'}
        </Button>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="app-stack" style={{ gap: 'var(--space-5)' }}>
        {error ? (
          <Banner tone="danger" title="Couldn't save this dish">
            {error}
          </Banner>
        ) : null}

        <RestaurantField
          value={restaurantName}
          place={place}
          error={restaurantError}
          knownPlaces={knownPlaces}
          fallbackNear={fallbackNear}
          onChange={(name, picked) => {
            setRestaurantName(name);
            setPlace(picked);
          }}
          onCommit={(name, picked) => fillFromLastTime(dishName, name, picked)}
        />

        <TextField
          label="Dish"
          placeholder="Pad see ew"
          list={dishListId}
          autoComplete="off"
          value={dishName}
          error={dishError}
          onChange={(e) => setDishName(e.target.value)}
          onBlur={() => fillFromLastTime(dishName, restaurantName)}
        />
        <datalist id={dishListId}>
          {dishSuggestions.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>

        <div className="app-sheet-section">
          <span className="label">How good was it?</span>
          <RatingInput value={rating} onValueChange={setRating} label="How good was it?" />
        </div>

        <div className="app-sheet-section">
          <span className="label">Order it again?</span>
          <VerdictPicker value={verdict} onValueChange={setVerdict} label="Order it again?" />
        </div>

        <div className="app-sheet-section">
          <span className="label">Next time</span>
          {filledFrom ? <p className="caption dl-muted">Filled in from the last time you had {filledFrom}.</p> : null}
          <div className="app-row">
            {tweaks.map((t, i) => (
              <TweakChip key={`${t.kind}-${t.text}-${i}`} kind={t.kind} onRemove={() => setTweaks((prev) => prev.filter((_, j) => j !== i))}>
                {t.text}
              </TweakChip>
            ))}
            {!adding ? (
              <Button size="sm" variant="secondary" iconLeft="plus" onClick={() => setAdding({ kind: 'remove', text: '' })}>
                Add a tweak
              </Button>
            ) : null}
          </div>
          {adding ? (
            <div className="app-tweak-add">
              <SegmentedControl
                label="Kind of tweak"
                fullWidth
                value={adding.kind}
                onValueChange={(kind) => setAdding({ ...adding, kind })}
                options={(Object.keys(TWEAK_KINDS) as TweakKind[]).map((k) => ({ value: k, label: TWEAK_KINDS[k].label, icon: TWEAK_KINDS[k].icon }))}
              />
              <div className="app-tweak-add-row">
                <TextField
                  label="Tweak"
                  placeholder={TWEAK_PLACEHOLDERS[adding.kind]}
                  maxLength={40}
                  value={adding.text}
                  onChange={(e) => setAdding({ ...adding, text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTweak();
                    }
                  }}
                />
                <Button variant="tonal" onClick={addTweak} disabled={!adding.text.trim()}>
                  Add
                </Button>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>
                Cancel
              </Button>
            </div>
          ) : null}
        </div>

        <div className="app-sheet-section">
          <span className="label">Photo</span>
          <div className="app-photo-pick">
            <DishPhoto src={shownPhoto || undefined} alt={dishName || 'Dish'} icon="camera" />
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="app-sr-only"
              aria-label="Choose a photo"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPhoto(file);
                e.target.value = '';
              }}
            />
            <Button variant="secondary" size="sm" iconLeft="camera" onClick={() => fileInput.current?.click()}>
              {shownPhoto ? 'Change photo' : 'Add photo'}
            </Button>
            {shownPhoto ? (
              <IconButton
                icon="trash"
                label="Remove photo"
                size="sm"
                onClick={() => {
                  setPhoto(null);
                  if (editing) setRemovedSavedPhoto(true);
                }}
              />
            ) : null}
          </div>
        </div>

        <TextField
          label="Price"
          optional
          type="text"
          inputMode="decimal"
          placeholder="18"
          suffix="USD"
          value={price}
          error={priceError}
          onChange={(e) => setPrice(e.target.value)}
        />

        <TextArea
          label="Notes"
          optional
          placeholder="What made it great (or not)?"
          maxLength={NOTES_MAX}
          length={notes.length}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </form>
    </BottomSheet>
  );
}
