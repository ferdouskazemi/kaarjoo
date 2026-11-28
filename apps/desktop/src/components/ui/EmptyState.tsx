import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from './cn.js';
import { Button } from './Button.js';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-[var(--radius-lg)] bg-surface/60 gap-3',
      className
    )}
  >
    {icon && <div className="text-muted">{icon}</div>}
    <h3 className="text-base font-semibold text-text">{title}</h3>
    <p className="text-sm text-muted max-w-md">{description}</p>
    {actionLabel && onAction && (
      <Button variant="primary" size="md" onClick={onAction} className="mt-1">
        {actionLabel}
      </Button>
    )}
  </div>
);

export interface ErrorStateProps {
  title: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  retryLabel = 'Retry',
  onRetry,
  className,
}) => (
  <div
    role="alert"
    className={cn(
      'flex flex-col items-start gap-2 p-4 border border-danger/30 bg-danger-weak rounded-[var(--radius-md)] text-text',
      className
    )}
  >
    <div className="flex items-center gap-2 text-danger font-semibold text-sm">
      <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{title}</span>
    </div>
    <p className="text-sm text-text-2">{message}</p>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        {retryLabel}
      </Button>
    )}
  </div>
);

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('animate-pulse bg-surface-3 rounded-[var(--radius-sm)]', className)} {...props} />
);
