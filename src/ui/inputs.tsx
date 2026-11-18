import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';
import { cx } from './constants';

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
}

function Field({
  id,
  label,
  hint,
  error,
  optional,
  disabled,
  className,
  children,
}: FieldProps & { id: string; disabled?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={cx('dl-field', error ? 'dl-field-invalid' : null, disabled && 'dl-field-disabled', className)}>
      {label ? (
        <label className="dl-field-label label" htmlFor={id}>
          {label}
          {optional ? <span className="dl-field-optional caption"> optional</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="dl-field-msg dl-field-error caption" id={`${id}-msg`}>
          <Icon name="alert" size={16} />
          {error}
        </p>
      ) : hint ? (
        <p className="dl-field-msg caption" id={`${id}-msg`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface TextFieldProps extends FieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  iconLeft?: IconName;
  suffix?: ReactNode;
}

/** A labeled single-line input. The label is always visible. */
export function TextField({ label, hint, error, optional, iconLeft, suffix, className, id: givenId, type = 'text', ...rest }: TextFieldProps) {
  const autoId = useId();
  const id = givenId ?? autoId;
  return (
    <Field id={id} label={label} hint={hint} error={error} optional={optional} disabled={rest.disabled} className={className}>
      <div className="dl-input-wrap">
        {iconLeft ? <Icon name={iconLeft} size={20} className="dl-input-icon" /> : null}
        <input
          type={type}
          {...rest}
          id={id}
          className={cx('dl-input body', iconLeft && 'dl-input-hasicon', suffix ? 'dl-input-hassuffix' : null)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
        />
        {suffix ? <span className="dl-input-suffix caption">{suffix}</span> : null}
      </div>
    </Field>
  );
}

interface TextAreaProps extends FieldProps, TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Current length, for the live "n / max" counter when maxLength is set. */
  length?: number;
}

/** Multi-line field for personal notes, set in body-lg. */
export function TextArea({ label, hint, error, optional, className, id: givenId, maxLength, length, rows = 3, ...rest }: TextAreaProps) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const counter = maxLength && length !== undefined ? `${length} / ${maxLength}` : undefined;
  return (
    <Field id={id} label={label} hint={hint ?? counter} error={error} optional={optional} disabled={rest.disabled} className={className}>
      <textarea
        rows={rows}
        {...rest}
        id={id}
        maxLength={maxLength}
        className="dl-input dl-textarea body-lg"
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint || counter ? `${id}-msg` : undefined}
      />
    </Field>
  );
}

interface SearchFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

/** Pill search box with a clear button once there's text. */
export function SearchField({ value, onValueChange, placeholder = 'Search dishes or places', label = 'Search', className }: SearchFieldProps) {
  return (
    <div className={cx('dl-search', className)} role="search">
      <Icon name="search" size={20} className="dl-search-icon" />
      <input
        type="search"
        className="dl-search-input body"
        placeholder={placeholder}
        aria-label={label}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
      />
      {value ? (
        <button type="button" className="dl-search-clear" aria-label="Clear search" onClick={() => onValueChange('')}>
          <Icon name="x" size={16} />
        </button>
      ) : null}
    </div>
  );
}

interface Option<T extends string> {
  value: T;
  label: ReactNode;
  icon?: IconName;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onValueChange: (value: T) => void;
  label: string;
  fullWidth?: boolean;
  className?: string;
}

/** Pill track of 2–4 options for switching what's shown in place. */
export function SegmentedControl<T extends string>({ options, value, onValueChange, label, fullWidth, className }: SegmentedControlProps<T>) {
  return (
    <div className={cx('dl-seg', fullWidth && 'dl-seg-full', className)} role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            className={cx('dl-seg-item label', on && 'dl-seg-on')}
            onClick={() => onValueChange(o.value)}
          >
            {o.icon ? <Icon name={o.icon} size={16} /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

interface ChipProps {
  children: ReactNode;
  selected: boolean;
  onSelectedChange: (selected: boolean) => void;
  icon?: IconName;
  count?: number;
  disabled?: boolean;
}

/** Toggleable filter pill. */
export function Chip({ children, selected, onSelectedChange, icon, count, disabled }: ChipProps) {
  return (
    <button
      type="button"
      className={cx('dl-chip label', selected && 'dl-chip-on')}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => onSelectedChange(!selected)}
    >
      {selected && !icon ? <Icon name="check" size={16} /> : icon ? <Icon name={icon} size={16} /> : null}
      <span>{children}</span>
      {count !== undefined ? <span className="dl-chip-count caption">{count}</span> : null}
    </button>
  );
}
