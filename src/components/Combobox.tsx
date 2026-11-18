import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

interface ComboboxProps {
  id?: string;
  /** Existing values to suggest. */
  options: string[];
  /** The current text. Anything typed counts, whether or not it's in `options`. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** A text input with suggestions: pick an existing option or just type a new value. */
export function Combobox({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select or enter new...',
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = value.trim().toLowerCase();
  const suggestions = search ? options.filter((option) => option.toLowerCase().includes(search)) : options;
  const showList = open && suggestions.length > 0;

  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-50"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Show restaurants"
        disabled={disabled}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className="absolute right-0 top-0 h-full px-2 text-gray-400 hover:text-gray-600"
      >
        <ChevronsUpDown className="h-4 w-4" />
      </button>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {suggestions.map((option) => {
            const selected = option === value;
            return (
              <li
                key={option}
                role="option"
                aria-selected={selected}
                // mousedown (not click) so the choice lands before the input loses focus.
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(option);
                }}
                className={`flex items-center justify-between cursor-pointer select-none px-3 py-2 hover:bg-gray-50 ${
                  selected ? 'bg-gray-50' : ''
                }`}
              >
                <span className="truncate">{option}</span>
                {selected && <Check className="h-4 w-4 text-indigo-600" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
