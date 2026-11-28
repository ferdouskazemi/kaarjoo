import React from 'react';
import { cn } from './cn.js';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center p-1 bg-surface-2 border border-border rounded-[var(--radius-md)] gap-1',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'min-h-[36px] px-3 py-1 text-xs font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              active ? 'bg-surface text-text border border-border shadow-xs' : 'text-muted hover:text-text'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
