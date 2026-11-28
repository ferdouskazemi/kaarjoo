import React from 'react';
import { cn } from './cn.js';
import { Meter } from './Meter.js';

export interface FieldRowProps {
  label: string;
  value?: React.ReactNode;
  confidence?: number;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
  dir?: 'ltr' | 'rtl' | 'auto';
  className?: string;
}

export const FieldRow: React.FC<FieldRowProps> = ({
  label,
  value,
  confidence,
  status,
  actions,
  onClick,
  dir = 'auto',
  className,
}) => (
  <div
    onClick={onClick}
    className={cn(
      'flex items-center justify-between gap-3 px-3 py-2.5 min-h-[44px] border-b border-border last:border-b-0',
      onClick && 'cursor-pointer hover:bg-surface-2/60 transition-colors',
      className
    )}
  >
    <div className="min-w-0 flex-1 flex items-center gap-4">
      <span className="text-xs font-medium uppercase tracking-wide text-muted w-32 shrink-0">
        {label}
      </span>
      <div className="text-sm text-text truncate" dir={dir}>
        {value ?? <span className="text-muted italic">—</span>}
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      {confidence !== undefined && <Meter value={confidence} />}
      {status}
      {actions}
    </div>
  </div>
);
