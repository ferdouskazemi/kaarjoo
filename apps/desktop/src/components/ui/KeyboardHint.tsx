import React from 'react';
import { cn } from './cn.js';

export const KeyboardHint: React.FC<{ keys: string; className?: string }> = ({ keys, className }) => (
  <kbd
    className={cn(
      'inline-flex items-center px-1.5 py-0.5 text-xs font-mono bg-surface-2 text-muted border border-border rounded-[var(--radius-sm)]',
      className
    )}
  >
    {keys}
  </kbd>
);
