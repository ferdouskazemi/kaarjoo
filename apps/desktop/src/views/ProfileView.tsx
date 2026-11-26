import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  UploadCloud,
  CheckCircle2,
  FileText,
  Briefcase,
  Sparkles,
  Phone,
  Mail,
  Globe,
  MapPin,
  ShieldCheck,
  Trash2,
  Loader2,
  RefreshCw,
  CheckCheck,
  Lock,
  BarChart3,
  Copy,
  Check,
  Code2,
  Play,
} from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { useProfile, useExtractProfile, useClearProfile } from '../queries/index.js';
import { useProfileStore, DEMO_CANDIDATE_PROFILE } from '../stores/profileStore.js';
import { useApplicationStore } from '../stores/applicationStore.js';
import { useAppStore } from '../stores/appStore.js';
import { usePipelineStore } from '../stores/pipelineStore.js';

export const ProfileView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { demoMode, setCurrentView } = useAppStore();
  const queryClient = useQueryClient();
  const { startAutoPipeline, isRunning: isPipelineRunning } = usePipelineStore();
  const { data: dbProfile } = useProfile();
  const extractMutation = useExtractProfile();
  const clearMutation = useClearProfile();

  const {
    profile: demoProfile,
    uploadedFileName,
    uploadedDocumentText,
    setUploadedDocument,
    setActiveHighlight,
    clearProfile,
    loadDemoProfile,
  } = useProfileStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmToast, setConfirmToast] = useState(false);

  // Active profile: SQLite database profile takes precedence, falling back to demo profile in demo mode
  const profile = dbProfile ?? (demoMode ? demoProfile : null);

  const handleFieldClick = (highlightText: string, label: string) => {
    setActiveHighlight(highlightText, label);
  };

  const processSelectedFile = async (selectedPath: string) => {
    setExtractError(null);
    setIsProcessing(true);
    try {
      const res = await extractMutation.mutateAsync(selectedPath);
      const fileName = res.sourceFileName || selectedPath.split(/[\\/]/).pop() || 'Resume';
      const lowerExt = selectedPath.split('.').pop()?.toLowerCase() || 'pdf';
      setUploadedDocument({
        fileName,
        text: res.rawText,
        meta: { pageCount: res.pagesCount || 1, fileType: lowerExt },
      });
      useApplicationStore.getState().syncWithProfile(res.profile as any);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('File pick/extract error:', err);
      setExtractError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickNativeFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Resume & Scanned Documents',
            extensions: ['pdf', 'docx', 'doc', 'odt', 'rtf', 'txt', 'md', 'png', 'jpg', 'jpeg', 'webp'],
          },
        ],
      });
      if (selected && typeof selected === 'string') {
        await processSelectedFile(selected);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Native file dialog error:', err);
      setExtractError(message);
    }
  };

  React.useEffect(() => {
    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/webview')
      .then(({ getCurrentWebview }) =>
        getCurrentWebview().onDragDropEvent((event) => {
          if (event.payload.type === 'over' || event.payload.type === 'enter') {
            setIsDragging(true);
          } else if (event.payload.type === 'leave') {
            setIsDragging(false);
          } else if (event.payload.type === 'drop') {
            setIsDragging(false);
            const droppedPath = event.payload.paths?.[0];
            if (droppedPath) {
              void processSelectedFile(droppedPath);
            }
          }
        })
      )
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {
        // Ignore in non-Tauri preview
      });
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const handleClearProfile = async () => {
    try {
      if (dbProfile) {
        await clearMutation.mutateAsync();
      }
    } catch {
      // Ignore Tauri IPC errors in browser/demo mode
    }
    clearProfile();
    useApplicationStore.getState().syncWithProfile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmProfile = () => {
    if (profile) {
      useApplicationStore.getState().syncWithProfile(profile as any);
      setConfirmToast(true);
      setTimeout(() => setConfirmToast(false), 3500);
    }
  };

  const handleConfirmAndRunAuto = () => {
    if (!profile) return;
    useApplicationStore.getState().syncWithProfile(profile as any);
    void startAutoPipeline({
      profile: profile as any,
      demoMode,
      lang: i18n.language,
      onInvalidate: async () => {
        await queryClient.invalidateQueries({ queryKey: ['jobs'] });
        await queryClient.invalidateQueries({ queryKey: ['applications'] });
      },
      onNavigateQueue: () => setCurrentView('queue'),
    });
  };

  const handleCopyText = () => {
    if (uploadedDocumentText) {
      navigator.clipboard.writeText(uploadedDocumentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const completenessScore = profile
    ? Math.min(
        100,
        Math.round(
          (profile.contact?.fullName ? 20 : 0) +
          (profile.contact?.email ? 20 : 0) +
          (profile.contact?.phone ? 10 : 0) +
          (profile.summary ? 15 : 0) +
          (profile.experiences && profile.experiences.length > 0 ? 15 : 0) +
          (profile.education && profile.education.length > 0 ? 10 : 0) +
          (profile.skills && profile.skills.length > 0 ? 10 : 0)
        )
      )
    : 0;

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full w-full bg-[#111111] text-[#f4f4f5]">
      {/* Hidden File Input fallback */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={() => handlePickNativeFile()}
        accept=".pdf,.docx,.doc,.txt,.md"
        className="hidden"
      />

      {/* Confirmation Toast */}
      {confirmToast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#1c2e24] border border-emerald-500/40 text-emerald-300 text-xs shadow-2xl active-ring backdrop-blur transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{t('profile.confirmToast')}</span>
        </div>
      )}

      {/* Extraction Error Banner */}
      {extractError && (
        <div role="alert" className="mx-6 mt-3 px-4 py-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between gap-3">
          <span className="truncate font-mono">{extractError}</span>
          <button
            type="button"
            onClick={() => setExtractError(null)}
            className="px-2 py-0.5 rounded bg-rose-900/70 hover:bg-rose-800 text-[11px] shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="h-12 border-b border-[#282828] bg-[#161616] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xs font-semibold text-[#f4f4f5] flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>{t('profile.title')}</span>
          </h1>

          {profile && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#1d2720] border border-emerald-500/30 text-emerald-400 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className="truncate max-w-[260px]">
                  {t('profile.extractedFrom')} {uploadedFileName || 'Ferdous Kazemi Resume.pdf'}
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <button
                onClick={handleClearProfile}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#382020] hover:border-rose-700/60 bg-[#221414] hover:bg-[#2b1717] text-[11px] font-medium text-rose-300 transition-colors cursor-pointer"
                title={t('profile.clear')}
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>{t('profile.clear')}</span>
              </button>

              <button
                onClick={handlePickNativeFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#333333] hover:border-[#484848] bg-[#202020] hover:bg-[#262626] text-[11px] font-medium text-[#d4d4d8] hover:text-white transition-colors cursor-pointer"
              >
                <UploadCloud className="w-3 h-3 text-sky-400" />
                <span>{t('profile.uploadAnother')}</span>
              </button>

              <button
                onClick={handleConfirmProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#333333] hover:border-[#484848] bg-[#202020] hover:bg-[#262626] text-[#d4d4d8] font-medium text-[11px] transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>{t('profile.confirm')}</span>
              </button>

              <button
                onClick={handleConfirmAndRunAuto}
                disabled={isPipelineRunning}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md fr-button-primary disabled:opacity-50 text-[11px] cursor-pointer"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>{t('profile.confirmAndRunAuto')}</span>
              </button>
            </>
          ) : demoMode ? (
            <button
              onClick={() => {
                loadDemoProfile();
                useApplicationStore.getState().syncWithProfile(DEMO_CANDIDATE_PROFILE);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-amber-500/40 hover:border-amber-500 bg-amber-500/10 text-amber-300 text-[11px] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-amber-400" />
              <span>{t('profile.loadSample')}</span>
            </button>
          ) : null}
        </div>
      </div>

      {isProcessing ? (
        /* Animated Flash-Rive Studio Extraction Scanner */
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-lg fr-studio-panel p-8 flex flex-col gap-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
              </div>
              <div>
                <span className="fr-eyebrow block">LOCAL PARSER</span>
                <h3 className="text-sm font-bold text-[#f4f4f5]">{t('profile.parsing')}</h3>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {[
                t('profile.extractStepRead'),
                t('profile.extractStepContact'),
                t('profile.extractStepSkills'),
                t('profile.extractStepExperience'),
              ].map((stepLabel, idx) => (
                <motion.div
                  key={stepLabel}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.14, duration: 0.28 }}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#141414]/80 border border-[#262626] fr-scan-line text-xs text-[#d4d4d8]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>{stepLabel}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      ) : !profile ? (
        /* Empty / Drop Zone State */
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handlePickNativeFile();
            }}
            onClick={handlePickNativeFile}
            className={`w-full max-w-xl p-10 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center text-center cursor-pointer group ${
              isDragging
                ? 'border-sky-500 bg-[#16222f]'
                : 'border-[#2d2d2d] hover:border-sky-500/50 bg-[#161616] hover:bg-[#1a1a1a]'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#202020] border border-[#2e2e2e] flex items-center justify-center text-sky-400 mb-4 group-hover:scale-105 transition-transform">
              {isProcessing ? (
                <Loader2 className="w-7 h-7 animate-spin text-sky-400" />
              ) : (
                <UploadCloud className="w-7 h-7 text-sky-400" />
              )}
            </div>

            <h3 className="text-sm font-semibold text-[#f4f4f5] mb-1">
              {isProcessing
                ? t('profile.processing')
                : t('profile.dropTitle')}
            </h3>
            <p className="text-xs text-[#a1a1aa] max-w-sm mb-4 leading-relaxed">
              {t('profile.dropDesc')}
              <br />
              <span className="text-[11px] text-[#71717a] font-mono">
                {t('profile.supportedFormats')}
              </span>
            </p>

            <div className="flex items-center gap-2 text-[11px] font-mono text-[#a1a1aa] bg-[#202020] px-3 py-1.5 rounded-lg border border-[#2b2b2b]">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('profile.localNotice')}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Split View Review Screen */
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-[#242424]">
          {/* Left Column: Structured Profile Cards */}
          <div className="h-full overflow-y-auto p-5 flex flex-col gap-4">
            {/* Extraction Insights & Summary Card */}
            <div className="rounded-xl border border-[#2d3748] bg-gradient-to-br from-[#131d27] via-[#161b22] to-[#141414] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#f4f4f5] flex items-center gap-1.5">
                      <span>{t('profile.insightsTitle')}</span>
                    </h3>
                    <p className="text-[11px] text-[#a1a1aa] mt-0.5">
                      {t('profile.insightsDesc')} «{uploadedFileName || 'Ferdous Kazemi Resume.pdf'}»
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#182a20] border border-emerald-500/30 text-[11px] font-medium text-emerald-400 shrink-0 font-mono">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{t('profile.completion')} {completenessScore}%</span>
                </div>
              </div>

              {/* 4 Mini Stat Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-[#181818] border border-[#262626] flex flex-col gap-0.5">
                  <span className="text-[10px] text-[#71717a]">{t('profile.identity')}</span>
                  <span className="text-[11px] font-semibold text-[#e4e4e7] flex items-center gap-1 truncate">
                    <CheckCheck className="w-3 h-3 text-emerald-400" />
                    <span className="truncate">{profile.contact?.fullName || 'Ferdous Kazemi'}</span>
                  </span>
                  <span className="text-[10px] text-[#a1a1aa] truncate font-mono">
                    {profile.contact?.email}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-[#181818] border border-[#262626] flex flex-col gap-0.5">
                  <span className="text-[10px] text-[#71717a]">{t('profile.experience')}</span>
                  <span className="text-[11px] font-semibold text-[#e4e4e7] flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-sky-400" />
                    <span>{profile.experiences?.length || 0} roles</span>
                  </span>
                  <span className="text-[10px] text-[#a1a1aa] truncate">
                    {profile.experiences?.[0]?.company || 'Active'}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-[#181818] border border-[#262626] flex flex-col gap-0.5">
                  <span className="text-[10px] text-[#71717a]">{t('profile.skills')}</span>
                  <span className="text-[11px] font-semibold text-[#e4e4e7] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{profile.skills?.length || 0} skills</span>
                  </span>
                  <span className="text-[10px] text-[#a1a1aa] font-mono">
                    Live ATS Match
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-[#181818] border border-[#262626] flex flex-col gap-0.5">
                  <span className="text-[10px] text-[#71717a]">{t('profile.provenanceGuarantee')}</span>
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>100% Offline</span>
                  </span>
                  <span className="text-[10px] text-[#a1a1aa]">
                    Zero Data Leak
                  </span>
                </div>
              </div>
            </div>

            {/* Review Before Auto-Pipeline Banner */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fr-studio-panel p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex flex-col gap-1">
                <span className="fr-eyebrow">{t('profile.reviewBeforeAutoTitle')}</span>
                <p className="text-xs text-[#a1a1aa] leading-relaxed">
                  {t('profile.reviewBeforeAutoDesc')}
                </p>
              </div>
              <button
                onClick={handleConfirmAndRunAuto}
                disabled={isPipelineRunning}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl fr-button-primary disabled:opacity-50 text-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{t('profile.confirmAndRunAuto')}</span>
              </button>
            </motion.div>

            {/* Top Identity Card */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="fr-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#f4f4f5]">{profile.contact?.fullName}</h2>
                  <p className="text-xs text-[#a1a1aa] mt-0.5 font-mono">
                    {profile.targetTitles?.[0] || 'Senior Frontend & Software Engineer'}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-[#1b2b21] text-emerald-400 border border-emerald-500/20">
                  {t('profile.verified')}
                </span>
              </div>

              {/* Contact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#d4d4d8]">
                <div
                  onClick={() => handleFieldClick(profile.contact?.email || '', t('profile.email'))}
                  className="p-2 rounded-lg bg-[#141414] border border-[#262626] hover:border-sky-500/50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate font-mono text-[11px] text-[#e4e4e7]">{profile.contact?.email}</span>
                </div>

                <div
                  onClick={() => handleFieldClick(profile.contact?.phone || '', t('profile.phone'))}
                  className="p-2 rounded-lg bg-[#141414] border border-[#262626] hover:border-sky-500/50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span dir="ltr" className="truncate font-mono text-[11px] text-[#e4e4e7]">{profile.contact?.phone || '--'}</span>
                </div>

                {profile.contact?.location && (
                  <div
                    onClick={() => handleFieldClick(profile.contact.location || '', t('profile.location'))}
                    className="p-2 rounded-lg bg-[#141414] border border-[#262626] hover:border-sky-500/50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate text-[11px]">{profile.contact.location}</span>
                  </div>
                )}

                {profile.contact?.linkedinUrl && (
                  <div
                    onClick={() => handleFieldClick(profile.contact.linkedinUrl || '', 'LinkedIn')}
                    className="p-2 rounded-lg bg-[#141414] border border-[#262626] hover:border-sky-500/50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    <span className="truncate font-mono text-[11px]">{profile.contact.linkedinUrl.replace('https://', '')}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Summary */}
            {profile.summary && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="fr-card p-4 flex flex-col gap-2"
              >
                <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider">
                  {t('profile.summary')}
                </span>
                <p className="text-xs text-[#d4d4d8] leading-relaxed">{profile.summary}</p>
              </motion.div>
            )}

            {/* Experiences List */}
            {profile.experiences && profile.experiences.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="fr-card p-4 flex flex-col gap-3"
              >
                <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                  <span>{t('profile.experience')} ({profile.experiences.length})</span>
                </span>
                <div className="flex flex-col gap-2.5">
                  {profile.experiences.map((exp) => (
                    <div key={exp.id} className="p-3 rounded-lg bg-[#141414] border border-[#262626] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{exp.title}</span>
                        <span className="text-[10px] font-mono text-[#71717a]">{exp.startDate} - {exp.isCurrent ? 'Present' : exp.endDate || ''}</span>
                      </div>
                      <span className="text-[11px] text-sky-400 font-medium">{exp.company} {exp.location ? `· ${exp.location}` : ''}</span>
                      {exp.achievements && exp.achievements.length > 0 && (
                        <ul className="list-disc list-inside text-[11px] text-[#a1a1aa] flex flex-col gap-1 mt-1">
                          {exp.achievements.map((ach, i) => (
                            <li key={i} className="line-clamp-2">{ach}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Skills Badges */}
            {profile.skills && profile.skills.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="fr-card p-4 flex flex-col gap-2.5"
              >
                <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('profile.skills')} ({profile.skills.length})</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((s, idx) => (
                    <motion.span
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: 0.26 + Math.min(idx, 18) * 0.025 }}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#141414] border border-[#2b2b2b] hover:border-sky-500/40 text-[#e4e4e7] transition-colors"
                    >
                      {s.name}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Clean Raw Text Inspector */}
          <div className="h-full overflow-y-auto p-5 flex flex-col gap-3 bg-[#141414]">
            <div className="flex items-center justify-between pb-2 border-b border-[#242424]">
              <span className="text-xs font-semibold text-[#d4d4d8] flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-sky-400" />
                <span>{uploadedFileName || 'Resume Document Source'}</span>
              </span>
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-[#202020] border border-[#2e2e2e]"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-xs font-mono text-[#a1a1aa] whitespace-pre-wrap leading-relaxed select-text">
              {uploadedDocumentText || 'Raw extracted resume text will appear here.'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
