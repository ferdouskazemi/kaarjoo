import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabledReason?: string;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-bg hover:opacity-90 border border-transparent font-semibold',
  secondary: 'bg-surface-2 text-text hover:bg-surface-3 border border-border',
  ghost: 'bg-transparent text-text-2 hover:text-text hover:bg-surface-2 border border-transparent',
  danger: 'bg-danger-weak text-danger hover:opacity-90 border border-danger/30 font-semibold',
  success: 'bg-success text-bg hover:opacity-90 border border-transparent font-semibold',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-[40px] px-3 py-1.5 text-xs gap-1.5 rounded-[var(--radius-sm)]',
  md: 'min-h-[40px] px-4 py-2 text-sm gap-2 rounded-[var(--radius-md)]',
  lg: 'min-h-[44px] px-5 py-2.5 text-base gap-2.5 rounded-[var(--radius-md)]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'md',
      loading = false,
      disabled,
      disabledReason,
      children,
      title,
      ...props
    },
    ref
  ) => {
    const isDisabled = Boolean(disabled || loading);
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        title={isDisabled && disabledReason ? disabledReason : title}
        aria-busy={loading || undefined}
        className={cn(
          'inline-flex items-center justify-center transition-colors cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
