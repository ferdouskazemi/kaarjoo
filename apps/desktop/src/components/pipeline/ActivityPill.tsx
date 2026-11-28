import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { usePipelineStore } from '../../stores/pipelineStore.js';
import { useAppStore } from '../../stores/appStore.js';
import { drawerVariants, pillVariants, staggerDelay } from '../../styles/motion.js';
import { formatNumber } from '../../utils/formatters.js';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import { AlertTriangle, Check, Pause, X } from 'lucide-react';

export const ActivityPill: React.FC = () => {
  const { i18n } = useTranslation();
  const { setCurrentView } = useAppStore();
  const {
    isVisible,
    isRunning,
    status,
    steps,
    discoveredJobs,
    currentItemIndex,
    totalItems,
    errorMessage,
    cancelPipeline,
    dismissPipeline,
  } = usePipelineStore();

  const [drawerOpen, setDrawerOpen] = useState(false);

  // Auto-hide done pill after 8s when drawer is closed
  useEffect(() => {
    if (status !== 'completed' || drawerOpen) return;
    const timer = setTimeout(() => {
      dismissPipeline();
    }, 8000);
    return () => clearTimeout(timer);
  }, [status, drawerOpen, dismissPipeline]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  const hasError = status === 'error' || Boolean(errorMessage);
  const showPill = isVisible && (isRunning || hasError || status === 'completed' || discoveredJobs.length > 0);

  if (!showPill && !drawerOpen) return null;

  const total = Math.max(1, totalItems || discoveredJobs.length || 1);
  const doneCount = discoveredJobs.filter((j) => j.itemStatus === 'done').length;
  const pct =
    status === 'completed'
      ? 100
      : Math.min(95, Math.round(((doneCount || currentItemIndex) / total) * 100));

  const pillLabel = hasError
    ? 'Action needed'
    : status === 'completed'
    ? `${formatNumber(doneCount || discoveredJobs.length, i18n.language)} ready to review · Open`
    : status === 'discovering'
    ? 'Finding matching jobs…'
    : `Preparing ${formatNumber(Math.min(currentItemIndex + 1, total), i18n.language)} of ${formatNumber(total, i18n.language)}`;

  return (
    <>
      {/* Scrim & 440px Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-40">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-bg/60 backdrop-blur-[1px]"
            />
            <motion.aside
              variants={drawerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              role="dialog"
              aria-label="Background activity"
              className="absolute bottom-6 end-6 w-[440px] max-w-[calc(100vw-3rem)] bg-surface border border-border-strong rounded-[20px] shadow-2xl p-5 flex flex-col gap-4 z-50"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-text">Preparing your applications</h2>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close activity drawer"
                  className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-[var(--radius-sm)] text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* 3 plain steps */}
              <div className="flex flex-col gap-1.5 text-sm">
                {[
                  { key: 'discover', label: 'Find matching jobs', state: steps.discover },
                  { key: 'tailor', label: 'Tailor résumé & cover letter', state: steps.tailor },
                  { key: 'prefill', label: 'Fill forms for your review', state: steps.prefill },
                ].map((s, idx) => (
                  <div key={s.key} className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        s.state === 'done'
                          ? 'bg-success text-bg'
                          : s.state === 'running'
                          ? 'border-2 border-accent text-accent-text'
                          : 'border border-border-strong text-muted'
                      }`}
                    >
                      {s.state === 'done' ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </span>
                    <span className={s.state === 'pending' ? 'text-muted' : 'text-text font-medium'}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {errorMessage && (
                <div className="p-3 rounded-[var(--radius-md)] bg-warning-weak border border-warning/30 flex items-start gap-2.5 text-sm text-text">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">Something needs your attention</div>
                    <p className="text-xs text-text-2 mt-0.5 line-clamp-3">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* Per-job rows */}
              {discoveredJobs.length > 0 && (
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
                  {discoveredJobs.map((job, idx) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: staggerDelay(idx) }}
                      className="p-2.5 rounded-[var(--radius-md)] bg-surface-2 flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-text truncate">{job.title}</div>
                          <div className="text-xs text-muted truncate">{job.company}</div>
                        </div>
                        <Badge
                          tone={
                            job.itemStatus === 'done'
                              ? 'ok'
                              : job.itemStatus === 'error'
                              ? 'bad'
                              : job.itemStatus === 'pending'
                              ? 'neutral'
                              : 'info'
                          }
                        >
                          {job.itemStatus === 'done'
                            ? 'Ready'
                            : job.itemStatus === 'error'
                            ? 'Needs you'
                            : job.itemStatus === 'pending'
                            ? 'Waiting'
                            : 'Preparing'}
                        </Badge>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            job.itemStatus === 'done'
                              ? 'bg-success w-full'
                              : job.itemStatus === 'error'
                              ? 'bg-danger w-full'
                              : job.itemStatus === 'pending'
                              ? 'bg-accent w-0'
                              : 'bg-accent w-2/3'
                          }`}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                {isRunning ? (
                  <Button variant="secondary" size="sm" onClick={cancelPipeline}>
                    <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Pause</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      dismissPipeline();
                      setDrawerOpen(false);
                    }}
                  >
                    <span>Dismiss</span>
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setDrawerOpen(false);
                    setCurrentView('queue');
                  }}
                >
                  <span>Open Applications</span>
                </Button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Activity Pill */}
      <AnimatePresence>
        {showPill && !drawerOpen && (
          <motion.button
            type="button"
            variants={pillVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={() => {
              if (status === 'completed' && !hasError) {
                setCurrentView('queue');
                dismissPipeline();
              } else {
                setDrawerOpen(true);
              }
            }}
            className="fixed bottom-5 end-6 z-40 min-h-[40px] px-4 py-2 rounded-full bg-surface-2 border border-border-strong shadow-xl flex items-center gap-2.5 text-sm font-medium text-text hover:border-accent transition-colors cursor-pointer"
          >
            {hasError ? (
              <span className="w-2.5 h-2.5 rounded-full bg-warning animate-pulse shrink-0" />
            ) : status === 'completed' ? (
              <span className="w-5 h-5 rounded-full bg-success text-bg flex items-center justify-center shrink-0">
                <Check className="w-3 h-3" aria-hidden="true" />
              </span>
            ) : (
              <span
                className="w-5 h-5 rounded-full shrink-0 grid place-items-center"
                style={{
                  background: `conic-gradient(var(--accent) ${pct}%, var(--surface-3) 0)`,
                }}
              >
                <span className="w-3 h-3 rounded-full bg-surface-2" />
              </span>
            )}
            <span className="whitespace-nowrap">{pillLabel}</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};
