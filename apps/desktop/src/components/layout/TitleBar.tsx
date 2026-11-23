import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/appStore';
import { Minus, Square, X, Cpu, Radio } from 'lucide-react';

export const TitleBar: React.FC = () => {
  const { t } = useTranslation();
  const { engineConnected, hardwareTier } = useAppStore();

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().minimize();
    } catch {
      // In web preview fallback
    }
  };

  const handleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().toggleMaximize();
    } catch {
      // In web preview fallback
    }
  };

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch {
      // In web preview fallback
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="h-10 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur flex items-center justify-between px-3 select-none z-50 shrink-0"
    >
      {/* App brand & status pills */}
      <div className="flex items-center gap-3" data-tauri-drag-region>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-xs">
            ک
          </div>
          <span className="text-xs font-semibold tracking-wide text-slate-200">
            {t('app.name')}
          </span>
        </div>

        {/* Engine status indicator */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
            engineConnected
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}
        >
          <Radio className="w-3 h-3 animate-pulse" />
          <span>{engineConnected ? t('status.engineConnected') : t('status.engineDisconnected')}</span>
        </div>

        {/* AI Tier badge */}
        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-900 border border-slate-800 text-slate-400">
          <Cpu className="w-3 h-3 text-sky-400" />
          <span className="uppercase">{hardwareTier}</span>
        </div>
      </div>

      {/* Window Controls for Windows */}
      <div className="flex items-center gap-1 -me-1" data-tauri-drag-region="false">
        <button
          onClick={handleMinimize}
          className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition-colors"
          title="Maximize"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded flex items-center justify-center text-slate-400 hover:text-rose-100 hover:bg-rose-600/80 transition-colors"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
