import { Check } from 'lucide-react';
import { type InputHTMLAttributes, forwardRef } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { checked, defaultChecked, onChange, disabled, className, label, description, id, ...props },
  ref,
) {
  return (
    <label
      htmlFor={id}
      className={`group relative inline-flex select-none items-start gap-2.5 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      } ${className || ''}`}
    >
      <div className="relative flex shrink-0 items-center justify-center pt-0.5">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={onChange}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div
          className="flex h-4.5 w-4.5 items-center justify-center rounded-md border border-(--od-border-strong) bg-(--od-surface-input) text-white transition-all duration-200 peer-checked:border-(--od-accent) peer-checked:bg-(--od-accent) peer-focus-visible:ring-2 peer-focus-visible:ring-(--od-accent) peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-(--od-bg) group-hover:border-(--od-accent)/60"
        >
          <Check className={`h-3.5 w-3.5 stroke-[3] transition-opacity duration-150 ${checked ? 'opacity-100' : 'opacity-0'}`} />
        </div>
      </div>

      {(label || description) && (
        <div className="min-w-0 flex-1">
          {label && (
            <span className="block text-sm font-medium text-(--od-text-primary) transition-colors group-hover:text-(--od-accent)">
              {label}
            </span>
          )}
          {description && (
            <span className="mt-0.5 block text-xs text-(--od-text-secondary)">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
});
