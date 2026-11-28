import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from './cn.js';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  className,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'w-full max-w-xl bg-surface border border-border-strong rounded-[var(--radius-lg)] shadow-2xl overflow-hidden',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold text-text">{title}</h2>
            {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-[var(--radius-sm)] text-muted hover:text-text hover:bg-surface-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};
