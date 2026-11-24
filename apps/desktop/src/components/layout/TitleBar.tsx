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
      className="h-9 border-b border-[#242424] bg-[#111111] flex items-center justify-between px-3 select-none z-50 shrink-0 text-[#f4f4f5]"
    >
      {/* App Brand & Status Pills */}
      <div className="flex items-center gap-3" data-tauri-drag-region>
        <div className="flex items-center gap-2">
          <div className="w-4.5 h-4.5 rounded bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-[11px]">
            ک
          </div>
          <span className="text-xs font-semibold tracking-wide text-[#f4f4f5]">
            {t('app.name')}
          </span>
        </div>

        {/* Engine Status Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${
            engineConnected
              ? 'bg-[#182a20] border-emerald-500/30 text-emerald-400'
              : 'bg-[#291b15] border-amber-500/30 text-amber-400'
          }`}
        >
          <Radio className="w-2.5 h-2.5 animate-pulse" />
          <span>{engineConnected ? t('status.engineConnected') : t('status.engineDisconnected')}</span>
        </div>

        {/* AI Tier Badge */}
        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#1a1a1a] border border-[#282828] text-[#a1a1aa]">
          <Cpu className="w-2.5 h-2.5 text-sky-400" />
          <span className="uppercase">{hardwareTier}</span>
        </div>
      </div>

      {/* Window Controls for Desktop Shell */}
      <div className="flex items-center gap-0.5 -me-1" data-tauri-drag-region="false">
        <button
          onClick={handleMinimize}
          className="w-7 h-7 rounded flex items-center justify-center text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#202020] transition-colors cursor-pointer"
          title="Minimize"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-7 rounded flex items-center justify-center text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#202020] transition-colors cursor-pointer"
          title="Maximize"
        >
          <Square className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 rounded flex items-center justify-center text-[#71717a] hover:text-rose-100 hover:bg-rose-600/80 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </header>
  );
};
