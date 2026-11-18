import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

interface ComboboxProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onAddNew?: (value: string) => void;
  placeholder?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  onAddNew,
  placeholder = "Select or enter new..."
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(search.toLowerCase())
  );

  const showAddNew = search && !filteredOptions.includes(search);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={search || value}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          placeholder={placeholder}
          className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 focus:border-indigo-500 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="absolute right-0 top-0 h-full px-2 text-gray-400 hover:text-gray-600"
        >
          <ChevronsUpDown className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {filteredOptions.length === 0 && !showAddNew ? (
            <div className="relative px-3 py-2 text-gray-500">
              No results found
            </div>
          ) : (
            <>
              {showAddNew && (
                <button
                  type="button"
                  className="relative w-full cursor-pointer select-none px-3 py-2 hover:bg-indigo-50 text-left text-indigo-600"
                  onClick={() => {
                    onAddNew?.(search);
                    onChange(search);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  Add "{search}"
                </button>
              )}
              {filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`relative w-full cursor-pointer select-none px-3 py-2 hover:bg-gray-50 text-left ${
                    option === value ? "bg-gray-50" : ""
                  }`}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <span className="block truncate">
                    {option}
                    {option === value && (
                      <Check className="h-4 w-4 inline-block ml-2 text-indigo-600" />
                    )}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}