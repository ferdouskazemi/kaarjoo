import React from 'react';
import { cn } from './cn.js';

export type BadgeTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  ok: 'bg-success-weak text-success border-success/30',
  warn: 'bg-warning-weak text-warning border-warning/30',
  bad: 'bg-danger-weak text-danger border-danger/30',
  info: 'bg-accent-weak text-accent-text border-accent/30',
  neutral: 'bg-surface-2 text-text-2 border-border',
};

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', className, children, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-full whitespace-nowrap',
      TONE_CLASSES[tone],
      className
    )}
    {...props}
  >
    {children}
  </span>
);

export const Chip = Badge;
