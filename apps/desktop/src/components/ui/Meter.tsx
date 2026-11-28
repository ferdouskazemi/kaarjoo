import React from 'react';
import { cn } from './cn.js';

export interface MeterProps {
  value: number; // 0..1 or 0..100
  bars?: number;
  label?: string;
  className?: string;
}

export const Meter: React.FC<MeterProps> = ({ value, bars = 3, label, className }) => {
  const norm = value > 1 ? value / 100 : value;
  const filledCount = Math.round(Math.max(0, Math.min(1, norm)) * bars);
  const toneClass = norm >= 0.75 ? 'bg-success' : norm >= 0.45 ? 'bg-warning' : 'bg-danger';

  return (
    <div
      className={cn('inline-flex items-center gap-1', className)}
      aria-label={label ?? `Confidence ${Math.round(norm * 100)}%`}
    >
      {Array.from({ length: bars }).map((_, idx) => (
        <span
          key={idx}
          className={cn(
            'w-1.5 h-3.5 rounded-xs',
            idx < filledCount ? toneClass : 'bg-surface-3'
          )}
        />
      ))}
    </div>
  );
};
