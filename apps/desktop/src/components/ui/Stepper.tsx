import React from 'react';
import { Check } from 'lucide-react';
import { cn } from './cn.js';

export interface StepItem {
  id: string;
  label: string;
  status: 'done' | 'current' | 'upcoming';
}

export interface StepperProps {
  steps: StepItem[];
  onStepClick?: (id: string) => void;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({ steps, onStepClick, className }) => (
  <nav aria-label="Progress steps" className={cn('flex items-center gap-2 flex-wrap', className)}>
    {steps.map((step, idx) => {
      const isDone = step.status === 'done';
      const isCurrent = step.status === 'current';
      return (
        <React.Fragment key={step.id}>
          <button
            type="button"
            disabled={!onStepClick || step.status === 'upcoming'}
            onClick={() => onStepClick?.(step.id)}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn(
              'min-h-[40px] inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isDone && 'bg-success-weak text-success border-success/30 cursor-pointer',
              isCurrent && 'bg-accent-weak text-accent-text border-accent/40 font-semibold',
              step.status === 'upcoming' && 'bg-surface-2 text-muted border-border cursor-not-allowed'
            )}
          >
            <span
              className={cn(
                'w-5 h-5 rounded-full inline-flex items-center justify-center text-xs font-semibold tabular-nums',
                isDone && 'bg-success text-bg',
                isCurrent && 'bg-accent text-bg',
                step.status === 'upcoming' && 'bg-surface-3 text-muted'
              )}
            >
              {isDone ? <Check className="w-3 h-3" aria-hidden="true" /> : idx + 1}
            </span>
            <span>{step.label}</span>
          </button>
          {idx < steps.length - 1 && <div className="h-px w-6 bg-border hidden sm:block" aria-hidden="true" />}
        </React.Fragment>
      );
    })}
  </nav>
);
