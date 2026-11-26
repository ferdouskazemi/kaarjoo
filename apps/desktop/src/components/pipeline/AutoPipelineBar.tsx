import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  X,
  Square,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { usePipelineStore, type PipelineStepStatus } from '../../stores/pipelineStore.js';
import { useAppStore } from '../../stores/appStore.js';
import { formatNumber } from '../../utils/formatters.js';

export const AutoPipelineBar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { setCurrentView } = useAppStore();
  const {
    isVisible,
    isRunning,
    status,
    steps,
    currentItemIndex,
    totalItems,
    currentItemLabel,
    errorMessage,
    cancelPipeline,
    dismissPipeline,
  } = usePipelineStore();

  const stepList: Array<{ key: keyof typeof steps; label: string; state: PipelineStepStatus }> = [
    { key: 'discover', label: t('pipeline.stepDiscover'), state: steps.discover },
    { key: 'tailor', label: t('pipeline.stepTailor'), state: steps.tailor },
    { key: 'prefill', label: t('pipeline.stepPrefill'), state: steps.prefill },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mx-6 mt-4 fr-studio-panel p-4 flex flex-col gap-3 shrink-0"
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                {isRunning ? (
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                ) : status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div>
                <span className="fr-eyebrow block">{t('pipeline.title')}</span>
                <p className="text-xs font-semibold text-[#f4f4f5]">
                  {isRunning && totalItems > 0 && currentItemIndex > 0
                    ? t('pipeline.runningItem', {
                        current: formatNumber(currentItemIndex, i18n.language),
                        total: formatNumber(totalItems, i18n.language),
                        label: currentItemLabel,
                      })
                    : status === 'completed'
                    ? t('pipeline.completedTitle')
                    : status === 'cancelled'
                    ? t('pipeline.cancelledTitle')
                    : errorMessage || t('pipeline.stepDiscover')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isRunning ? (
                <button
                  onClick={cancelPipeline}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-medium cursor-pointer transition-colors"
                >
                  <Square className="w-3 h-3 fill-rose-400" />
                  <span>{t('pipeline.stop')}</span>
                </button>
              ) : (
                <>
                  {status === 'completed' && (
                    <button
                      onClick={() => setCurrentView('queue')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg fr-button-primary text-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{t('pipeline.openQueue')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={dismissPipeline}
                    aria-label={t('pipeline.dismiss')}
                    className="p-1.5 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#242424] cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 3-Step Sequential Indicator */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {stepList.map((s, idx) => {
              const isStepRunning = s.state === 'running';
              const isStepDone = s.state === 'done';
              return (
                <motion.div
                  key={s.key}
                  layout
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs transition-colors ${
                    isStepRunning
                      ? 'bg-sky-500/10 border-sky-500/40 text-sky-200 fr-scan-line'
                      : isStepDone
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-[#141414]/70 border-[#262626] text-[#71717a]'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border border-current shrink-0">
                    {isStepDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : isStepRunning ? (
                      <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                    ) : (
                      formatNumber(idx + 1, i18n.language)
                    )}
                  </span>
                  <span className="font-medium truncate">{s.label}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
