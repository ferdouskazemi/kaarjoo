import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  Loader2,
  Sparkles,
  X,
  Square,
  ArrowRight,
  AlertTriangle,
  Globe,
  Play,
  Building2,
} from 'lucide-react';
import { usePipelineStore, type PipelineStepStatus } from '../../stores/pipelineStore.js';
import { useAppStore } from '../../stores/appStore.js';
import { formatNumber } from '../../utils/formatters.js';

export const AutoPipelineBar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { setCurrentView, demoMode } = useAppStore();
  const {
    isVisible,
    isRunning,
    status,
    steps,
    discoveredJobs,
    currentItemIndex,
    totalItems,
    currentItemLabel,
    errorMessage,
    startApplyStage,
    cancelPipeline,
    dismissPipeline,
  } = usePipelineStore();

  const stepList: Array<{ key: keyof typeof steps; label: string; state: PipelineStepStatus }> = [
    { key: 'discover', label: t('pipeline.stepDiscover'), state: steps.discover },
    { key: 'tailor', label: t('pipeline.stepTailor'), state: steps.tailor },
    { key: 'prefill', label: t('pipeline.stepPrefill'), state: steps.prefill },
  ];

  const handleStartApply = () => {
    void startApplyStage({
      demoMode,
      lang: i18n.language,
      onInvalidate: async () => {
        await queryClient.invalidateQueries({ queryKey: ['jobs'] });
        await queryClient.invalidateQueries({ queryKey: ['applications'] });
      },
      onNavigateQueue: () => setCurrentView('queue'),
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -14, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="mx-6 mt-4 fr-studio-panel p-5 flex flex-col gap-4 shrink-0"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center overflow-hidden">
                {status === 'discovering' ? (
                  <>
                    <motion.span
                      animate={{ scale: [1, 1.7, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-2xl border border-sky-400"
                    />
                    <Globe className="w-4 h-4 text-sky-400 animate-pulse" />
                  </>
                ) : isRunning ? (
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                ) : status === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : status === 'discovered' ? (
                  <Sparkles className="w-4 h-4 text-sky-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>

              <div>
                <span className="fr-eyebrow block">{t('pipeline.title')}</span>
                <p className="text-xs font-semibold text-[#f4f4f5]">
                  {status === 'discovering'
                    ? t('pipeline.crawlingWebsites')
                    : status === 'discovered'
                    ? discoveredJobs.length > 0
                      ? t('pipeline.discoveredHeader')
                      : t('pipeline.noMatchingJobs')
                    : isRunning && totalItems > 0 && currentItemIndex > 0
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
              {status === 'discovered' && discoveredJobs.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleStartApply}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl fr-button-primary text-xs cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>{t('pipeline.startAutoApply')}</span>
                </motion.button>
              )}

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

          {/* Live Discovered Jobs Grid with Animated Checkmarks */}
          {discoveredJobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              <AnimatePresence>
                {discoveredJobs.map((job, idx) => {
                  const isDone = job.itemStatus === 'done';
                  const isError = job.itemStatus === 'error';
                  const isActive = job.itemStatus === 'tailoring' || job.itemStatus === 'filling';

                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.28, delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                      className={`rounded-xl border p-3 flex flex-col gap-2 transition-colors ${
                        isDone
                          ? 'bg-emerald-950/25 border-emerald-500/40'
                          : isError
                          ? 'bg-rose-950/25 border-rose-500/40'
                          : isActive
                          ? 'bg-sky-950/25 border-sky-500/50 fr-scan-line'
                          : 'bg-[#161616] border-[#262626]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate font-medium">{job.company}</span>
                            <span className="px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-300 font-mono text-[10px]">
                              {formatNumber(job.matchScore, i18n.language)}%
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-[#f4f4f5] line-clamp-1 mt-0.5">
                            {job.title}
                          </h4>
                        </div>

                        {/* Animated Status Checkmark / Spinner */}
                        <div className="shrink-0">
                          {isDone ? (
                            <motion.div
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                              className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </motion.div>
                          ) : isActive ? (
                            <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
                          ) : isError ? (
                            <AlertTriangle className="w-5 h-5 text-rose-400" />
                          ) : null}
                        </div>
                      </div>

                      {job.matchedSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.matchedSkills.map((sk) => (
                            <span
                              key={sk}
                              className="px-1.5 py-0.5 rounded bg-[#1d1d1d] border border-[#2c2c2c] text-[10px] text-[#d4d4d8]"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
