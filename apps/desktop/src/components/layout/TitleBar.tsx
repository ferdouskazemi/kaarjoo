import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/appStore.js';
import { Minus, Square, X } from 'lucide-react';
import { Badge } from '../ui/Badge.js';

export const TitleBar: React.FC = () => {
  const { t } = useTranslation();
  const { demoMode } = useAppStore();

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch {
      // Web preview fallback
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().toggleMaximize();
    } catch {
      // Web preview fallback
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch {
      // Web preview fallback
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="h-10 border-b border-border bg-bg flex items-center justify-between px-3 select-none z-50 shrink-0 text-text"
    >
      <div className="flex items-center gap-2.5" data-tauri-drag-region>
        <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-accent-weak border border-accent/30 flex items-center justify-center text-accent-text font-bold text-xs">
          K
        </div>
        <span className="text-sm font-semibold tracking-tight text-text">
          {t('app.name')}
        </span>
        {demoMode && <Badge tone="warn">Demo</Badge>}
      </div>

      <div className="flex items-center gap-0.5 -me-1" data-tauri-drag-region="false">
        <button
          type="button"
          onClick={handleMinimize}
          className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Minimize"
          aria-label="Minimize window"
        >
          <Minus className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Maximize"
          aria-label="Maximize window"
        >
          <Square className="w-3 h-3" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center text-muted hover:text-text hover:bg-danger-weak hover:text-danger transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Close"
          aria-label="Close window"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};
