import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Icon, Spinner, TextField } from '../ui';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { currentLocation, distanceKm, formatDistance, searchPlaces, type LatLon, type PlaceSuggestion } from '../lib/placeSearch';
import type { PlaceRef } from '../types';

/** A restaurant you've logged before, offered first. */
export interface KnownPlace {
  name: string;
  place?: PlaceRef;
}

interface RestaurantFieldProps {
  value: string;
  place?: PlaceRef;
  /** Typing passes no place; picking a suggestion passes its location. */
  onChange: (name: string, place?: PlaceRef) => void;
  /** After a suggestion is picked or the field loses focus. */
  onCommit?: (name: string, place?: PlaceRef) => void;
  error?: string;
  knownPlaces: KnownPlace[];
  /** Search near here when your location isn't available, e.g. the last place you logged. */
  fallbackNear?: LatLon;
}

type Option = { group: 'yours' | 'nearby'; name: string; place?: PlaceRef; distanceKm?: number };

const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

/**
 * Restaurant name with suggestions: places you've logged that match, then nearby
 * restaurants from OpenStreetMap, nearest first. Typing anything else still works.
 */
export function RestaurantField({ value, place, onChange, onCommit, error, knownPlaces, fallbackNear }: RestaurantFieldProps) {
  const listId = useId();
  const online = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [here, setHere] = useState<LatLon | undefined>();
  const askedForLocation = useRef(false);
  // The latest finished search, tagged with what it searched for, so stale results never show.
  const [result, setResult] = useState<{ key: string; items: PlaceSuggestion[]; failed: boolean } | null>(null);
  const [pickedName, setPickedName] = useState<string | null>(null);

  const query = value.trim();
  const near = here ?? fallbackNear;

  const askForLocation = () => {
    if (askedForLocation.current) return;
    askedForLocation.current = true;
    void currentLocation().then((loc) => loc && setHere(loc));
  };

  const shouldSearch = open && query.length >= MIN_QUERY && online && pickedName !== value;
  const searchKey = shouldSearch ? `${query.toLowerCase()}|${near?.lat ?? ''},${near?.lon ?? ''}` : null;
  const current = result && result.key === searchKey ? result : null;
  const searching = searchKey !== null && !current;
  const searchFailed = current?.failed ?? false;

  useEffect(() => {
    if (!searchKey) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchPlaces(query, near, controller.signal)
        .then((items) => setResult({ key: searchKey, items, failed: false }))
        .catch((err) => {
          if (controller.signal.aborted) return;
          console.warn('Place search failed:', err);
          setResult({ key: searchKey, items: [], failed: true });
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // searchKey covers query and near.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  const options = useMemo<Option[]>(() => {
    if (!open || pickedName === value) return [];
    const q = query.toLowerCase();
    const yours = knownPlaces
      .filter((k) => !q || k.name.toLowerCase().includes(q))
      .map((k) => ({ group: 'yours' as const, name: k.name, place: k.place, distanceKm: near && k.place ? distanceKm(near, k.place) : undefined }))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || a.name.localeCompare(b.name))
      .slice(0, q ? 4 : 5);
    const yourIds = new Set(yours.flatMap((o) => (o.place ? [o.place.id] : [])));
    const others = (current?.items ?? []).filter((s) => !yourIds.has(s.place.id)).map((s) => ({ group: 'nearby' as const, ...s }));
    return [...yours, ...others];
  }, [open, value, pickedName, query, knownPlaces, current, near]);

  const pick = (option: Option) => {
    setPickedName(option.name);
    onChange(option.name, option.place);
    onCommit?.(option.name, option.place);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      if (!options.length) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + options.length) % options.length);
    } else if (e.key === 'Enter' && open && active >= 0 && options[active]) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  const showList = open && (options.length > 0 || searching || searchFailed || (!online && query.length >= MIN_QUERY));
  const optionId = (i: number) => `${listId}-opt-${i}`;
  const nearbyStart = options.findIndex((o) => o.group === 'nearby');

  return (
    <div className="app-place-field">
      <TextField
        label="Restaurant"
        iconLeft="map-pin"
        placeholder="Start typing, like Perkins"
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        value={value}
        error={error}
        hint={place?.address ? place.address : undefined}
        onFocus={() => {
          askForLocation();
          setOpen(true);
        }}
        onChange={(e) => {
          setPickedName(null);
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setOpen(false);
          setActive(-1);
          onCommit?.(value, place);
        }}
      />
      <div className="app-place-list" id={listId} role="listbox" aria-label="Restaurant suggestions" hidden={!showList}>
        {options.map((o, i) => (
          <div key={`${o.group}-${o.place?.id ?? o.name}`} className="app-place-group">
            {i === 0 && o.group === 'yours' ? <p className="app-place-heading caption" aria-hidden>Your places</p> : null}
            {i === nearbyStart ? <p className="app-place-heading caption" aria-hidden>Nearby</p> : null}
            <div
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              className="app-place-option"
              // Keep focus in the input so blur doesn't close the list before the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(o)}
              onMouseEnter={() => setActive(i)}
            >
              <Icon name={o.group === 'yours' ? 'clock' : 'map-pin'} size={18} className="app-place-icon" />
              <span className="app-place-text">
                <span className="body app-place-name">{o.name}</span>
                {o.place?.address ? <span className="caption dl-muted">{o.place.address}</span> : null}
              </span>
              {o.distanceKm != null ? <span className="caption dl-muted app-place-distance">{formatDistance(o.distanceKm)}</span> : null}
            </div>
          </div>
        ))}
        {searching ? (
          <p className="app-place-status caption dl-muted" role="status">
            <Spinner size={14} tone="current" label="Searching" /> Searching nearby…
          </p>
        ) : !online && query.length >= MIN_QUERY ? (
          <p className="app-place-status caption dl-muted">Offline, so only your places show. Typing the name works too.</p>
        ) : searchFailed ? (
          <p className="app-place-status caption dl-muted">Couldn't search nearby places. Typing the name works too.</p>
        ) : null}
      </div>
    </div>
  );
}
