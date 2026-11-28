import React from 'react';
import { cn } from './cn.js';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

export interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: TabItem<T>[];
  ariaLabel?: string;
  className?: string;
}

export function Tabs<T extends string>({ value, onChange, items, ariaLabel, className }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex items-center gap-1 border-b border-border', className)}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              'min-h-[40px] px-3 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer inline-flex items-center gap-2',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              active
                ? 'border-accent text-text'
                : 'border-transparent text-muted hover:text-text'
            )}
          >
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-surface-2 text-text-2 tabular-nums">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
