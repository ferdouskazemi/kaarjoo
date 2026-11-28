import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  Check,
  ChevronDown,
  FolderOpen,
  Globe,
  Minus,
  Rocket,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { COPY, type Lang } from './i18n';
import { FlashRiveEmblem, type EmblemPhase } from './components/FlashRiveEmblem';
import { MOTION_EASE, MOTION_SPRING, stageVariants, staggerItemVariants } from './styles/motion';

interface InstallProgressEvent {
  progress: number;
  stage: 'extract' | 'engine' | 'shortcuts' | 'verify';
}

export function App() {
  const [lang, setLang] = useState<Lang>('fa');
  const [phase, setPhase] = useState<EmblemPhase>('welcome');
  const [showOptions, setShowOptions] = useState(false);
  const [installDir, setInstallDir] = useState('');
  const [desktopShortcut, setDesktopShortcut] = useState(true);
  const [launchAfter, setLaunchAfter] = useState(true);
  const [progress, setProgress] = useState(0);
  const [activeStage, setActiveStage] = useState<InstallProgressEvent['stage']>('extract');
  const [errorMessage, setErrorMessage] = useState('');

  const t = COPY[lang];
  const isRtl = lang === 'fa';

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [lang, isRtl]);

  useEffect(() => {
    invoke<string>('get_default_install_dir')
      .then((dir) => setInstallDir(dir))
      .catch(() => setInstallDir('C:\\Users\\User\\AppData\\Local\\Kaarjoo'));

    const unlistenProgress = listen<InstallProgressEvent>('install-progress', (event) => {
      setProgress(event.payload.progress);
      setActiveStage(event.payload.stage);
    });

    return () => {
      unlistenProgress.then((fn) => fn());
    };
  }, []);

  const handleBrowse = async () => {
    try {
      const picked = await invoke<string | null>('pick_install_dir', { currentDir: installDir });
      if (picked) {
        setInstallDir(picked);
      }
    } catch {
      // Keep current path if picker fails or is cancelled
    }
  };

  const handleStartInstall = async () => {
    setPhase('installing');
    setProgress(6);
    setActiveStage('extract');
    setErrorMessage('');
    try {
      const finalPath = await invoke<string>('run_silent_install', {
        installDir,
        desktopShortcut,
      });
      setInstallDir(finalPath);
      setProgress(100);
      setActiveStage('verify');
      setPhase('complete');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  };

  const handleLaunchApp = async () => {
    try {
      await invoke('launch_installed_app', { installDir });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  };

  const handleMinimize = () => {
    getCurrentWindow().minimize().catch(() => {});
  };

  const handleClose = () => {
    getCurrentWindow().close().catch(() => {});
  };

  const milestoneOrder: InstallProgressEvent['stage'][] = ['extract', 'engine', 'shortcuts', 'verify'];
  const activeStageIdx = milestoneOrder.indexOf(activeStage);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0E1013] text-[#F1F4F8]">
      {/* Subtle flash-rive top ambient light */}
      <div
        className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[520px] -translate-x-1/2 rounded-full opacity-35 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, rgba(91,147,255,0.36) 0%, rgba(63,196,143,0.12) 55%, transparent 100%)',
        }}
      />

      {/* Frameless custom titlebar */}
      <header
        data-tauri-drag-region
        className="relative z-10 flex h-12 shrink-0 items-center justify-between border-b border-white/[0.07] px-4"
      >
        <div className="flex items-center gap-2.5" data-tauri-drag-region>
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#5B93FF]/15 text-xs font-bold text-[#5B93FF]">
            K
          </span>
          <span className="text-sm font-semibold tracking-tight text-[#F1F4F8]">{t.appName}</span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-[#A6B0BD]">
            {t.versionBadge}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLang((prev) => (prev === 'fa' ? 'en' : 'fa'))}
            className="flex h-7 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-xs font-medium text-[#A6B0BD] transition hover:border-white/20 hover:text-white"
            title="Switch Language"
          >
            <Globe className="h-3.5 w-3.5 text-[#5B93FF]" />
            <span>{lang === 'fa' ? 'EN' : 'فا'}</span>
          </button>

          <button
            type="button"
            onClick={handleMinimize}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#A6B0BD] transition hover:bg-white/[0.07] hover:text-white"
            aria-label="Minimize"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleClose}
            disabled={phase === 'installing'}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#A6B0BD] transition hover:bg-[#F26B5E]/20 hover:text-[#F26B5E] disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Main animated stage */}
      <main className="relative z-10 flex flex-1 flex-col justify-between px-7 py-5">
        <AnimatePresence mode="wait">
          {phase === 'welcome' && (
            <motion.section
              key="welcome"
              variants={stageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-1 flex-col justify-between"
            >
              <div className="flex items-center gap-6">
                <motion.div variants={staggerItemVariants} className="shrink-0">
                  <FlashRiveEmblem phase="welcome" progress={28} />
                </motion.div>

                <div className="space-y-2">
                  <motion.div
                    variants={staggerItemVariants}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#5B93FF]/12 px-2.5 py-0.5 text-xs font-medium text-[#88B2FF]"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{t.appName} Installer</span>
                  </motion.div>

                  <motion.h1
                    variants={staggerItemVariants}
                    className="text-xl font-bold leading-snug text-[#F1F4F8]"
                  >
                    {t.titleWelcome}
                  </motion.h1>

                  <motion.p
                    variants={staggerItemVariants}
                    className="text-[13px] leading-relaxed text-[#A6B0BD]"
                  >
                    {t.subtitleWelcome}
                  </motion.p>
                </div>
              </div>

              {/* 3 compact value cards */}
              <motion.div variants={staggerItemVariants} className="grid grid-cols-3 gap-3 my-3">
                {t.highlights.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-white/[0.08] bg-[#15191E]/90 p-3 transition hover:border-[#5B93FF]/35"
                  >
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#F1F4F8]">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#3FC48F]" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-[11.5px] leading-relaxed text-[#A6B0BD]">{item.desc}</p>
                  </div>
                ))}
              </motion.div>

              {/* Expandable install options */}
              <motion.div variants={staggerItemVariants} className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setShowOptions((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#88B2FF] transition hover:text-[#5B93FF]"
                >
                  <motion.span
                    animate={{ rotate: showOptions ? 180 : 0 }}
                    transition={MOTION_SPRING}
                    className="inline-flex"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </motion.span>
                  <span>{showOptions ? t.hideOptions : t.customizePath}</span>
                </button>

                <AnimatePresence initial={false}>
                  {showOptions && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.24, ease: MOTION_EASE }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2.5 rounded-xl border border-white/[0.08] bg-[#15191E] p-3">
                        <div className="flex items-center gap-2">
                          <span className="shrink-0 text-xs text-[#A6B0BD]">{t.installLocation}:</span>
                          <input
                            type="text"
                            value={installDir}
                            onChange={(e) => setInstallDir(e.target.value)}
                            dir="ltr"
                            className="h-8 flex-1 rounded-lg border border-white/10 bg-[#0E1013] px-2.5 text-xs text-[#F1F4F8] outline-none focus:border-[#5B93FF]"
                          />
                          <button
                            type="button"
                            onClick={handleBrowse}
                            className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-[#1D2229] px-3 text-xs font-medium text-[#F1F4F8] transition hover:border-white/25"
                          >
                            <FolderOpen className="h-3.5 w-3.5 text-[#5B93FF]" />
                            <span>{t.browse}</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-5 pt-0.5 text-xs text-[#A6B0BD]">
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={desktopShortcut}
                              onChange={(e) => setDesktopShortcut(e.target.checked)}
                              className="h-3.5 w-3.5 accent-[#5B93FF]"
                            />
                            <span>{t.desktopShortcut}</span>
                          </label>
                          <label className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={launchAfter}
                              onChange={(e) => setLaunchAfter(e.target.checked)}
                              className="h-3.5 w-3.5 accent-[#5B93FF]"
                            />
                            <span>{t.launchAfterInstall}</span>
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Footer CTA */}
              <motion.div
                variants={staggerItemVariants}
                className="flex items-center justify-between border-t border-white/[0.07] pt-3.5"
              >
                <span className="text-[11.5px] text-[#76808E]">{t.safeNote}</span>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={MOTION_SPRING}
                  onClick={handleStartInstall}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#5B93FF] px-6 text-sm font-semibold text-[#0B1018] shadow-[0_8px_24px_rgba(91,147,255,0.28)] transition hover:bg-[#6FA0FF]"
                >
                  <Rocket className="h-4 w-4" />
                  <span>{t.installBtn}</span>
                </motion.button>
              </motion.div>
            </motion.section>
          )}

          {phase === 'installing' && (
            <motion.section
              key="installing"
              variants={stageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
            >
              <FlashRiveEmblem phase="installing" progress={progress} />

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#F1F4F8]">{t.installingTitle}</h2>
                <p className="text-xs text-[#A6B0BD]">{t.installingSubtitle}</p>
              </div>

              {/* Progress track with flash-shimmer */}
              <div className="w-full max-w-md space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#88B2FF]">{t.milestones[activeStage]}</span>
                  <span className="font-mono text-[#F1F4F8]">{Math.round(progress)}%</span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                  <motion.div
                    className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[#5B93FF] to-[#3FC48F]"
                    animate={{ width: `${Math.max(4, progress)}%` }}
                    transition={{ duration: 0.35, ease: MOTION_EASE }}
                  >
                    <div className="flash-shimmer-bar absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                  </motion.div>
                </div>
              </div>

              {/* 4 Live Milestones */}
              <div className="grid w-full max-w-md grid-cols-2 gap-2 text-start">
                {milestoneOrder.map((key, idx) => {
                  const done = idx < activeStageIdx;
                  const current = idx === activeStageIdx;
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                        done
                          ? 'border-[#3FC48F]/30 bg-[#3FC48F]/10 text-[#F1F4F8]'
                          : current
                            ? 'border-[#5B93FF]/40 bg-[#5B93FF]/10 text-[#F1F4F8]'
                            : 'border-white/[0.06] bg-[#15191E]/60 text-[#76808E]'
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                          done
                            ? 'bg-[#3FC48F] text-[#0B1018]'
                            : current
                              ? 'bg-[#5B93FF] text-[#0B1018]'
                              : 'bg-white/10 text-[#76808E]'
                        }`}
                      >
                        {done ? <Check className="h-2.5 w-2.5" /> : idx + 1}
                      </span>
                      <span className="truncate">{t.milestones[key]}</span>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {phase === 'complete' && (
            <motion.section
              key="complete"
              variants={stageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
            >
              <FlashRiveEmblem phase="complete" progress={100} />

              <motion.div variants={staggerItemVariants} className="space-y-1.5">
                <h2 className="text-xl font-bold text-[#F1F4F8]">{t.completeTitle}</h2>
                <p className="max-w-md text-xs leading-relaxed text-[#A6B0BD]">
                  {t.completeSubtitle}
                </p>
              </motion.div>

              <motion.div
                variants={staggerItemVariants}
                className="w-full max-w-md rounded-xl border border-[#3FC48F]/25 bg-[#15191E] px-4 py-3 text-start"
              >
                <div className="text-[11px] text-[#76808E]">{t.installedAt}</div>
                <div dir="ltr" className="mt-0.5 truncate font-mono text-xs text-[#F1F4F8]">
                  {installDir}
                </div>
              </motion.div>

              <motion.div variants={staggerItemVariants} className="flex items-center gap-3 pt-1">
                {launchAfter && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={MOTION_SPRING}
                    onClick={handleLaunchApp}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#3FC48F] px-6 text-sm font-semibold text-[#0B1018] shadow-[0_8px_24px_rgba(63,196,143,0.28)] transition hover:bg-[#52D19E]"
                  >
                    <Rocket className="h-4 w-4" />
                    <span>{t.launchNow}</span>
                  </motion.button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex h-10 items-center rounded-xl border border-white/12 bg-[#15191E] px-5 text-xs font-medium text-[#F1F4F8] transition hover:border-white/25"
                >
                  {t.close}
                </button>
              </motion.div>
            </motion.section>
          )}

          {phase === 'error' && (
            <motion.section
              key="error"
              variants={stageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-1 flex-col items-center justify-center gap-5 text-center"
            >
              <FlashRiveEmblem phase="error" progress={progress} />

              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-[#F26B5E]">{t.errorTitle}</h2>
                <p
                  dir="ltr"
                  className="max-w-lg rounded-lg border border-[#F26B5E]/25 bg-[#15191E] px-3 py-2 font-mono text-xs text-[#A6B0BD]"
                >
                  {errorMessage || 'Unknown installer error'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleStartInstall}
                  className="inline-flex h-10 items-center rounded-xl bg-[#5B93FF] px-6 text-sm font-semibold text-[#0B1018]"
                >
                  {t.retry}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex h-10 items-center rounded-xl border border-white/12 bg-[#15191E] px-5 text-xs font-medium text-[#F1F4F8]"
                >
                  {t.close}
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
export default App;
