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
  Pencil,
  Plus,
  X,
  GraduationCap,
} from 'lucide-react';
import { useProfile, useExtractProfile, useClearProfile } from '../queries/index.js';
import { useProfileStore, DEMO_CANDIDATE_PROFILE } from '../stores/profileStore.js';
import { useApplicationStore } from '../stores/applicationStore.js';
import { useAppStore } from '../stores/appStore.js';
import { usePipelineStore } from '../stores/pipelineStore.js';
import { commands, type UserProfileDto } from '../bindings.js';

export const ProfileView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { demoMode } = useAppStore();
  const queryClient = useQueryClient();
  const { startDiscoveryStage, isRunning: isPipelineRunning } = usePipelineStore();
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
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [rightTab, setRightTab] = useState<'readable' | 'raw'>('readable');

  // Inline Edit States
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [identityDraft, setIdentityDraft] = useState({
    fullName: '',
    targetTitle: '',
    email: '',
    phone: '',
    location: '',
    linkedinUrl: '',
  });
  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [expDraft, setExpDraft] = useState({
    title: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    achievementsText: '',
  });
  const [newSkillName, setNewSkillName] = useState('');

  // Active profile: SQLite database profile takes precedence, falling back to demo profile in demo mode
  const profile = dbProfile ?? (demoMode ? demoProfile : null);

  const handleFieldClick = (highlightText: string, label: string) => {
    setActiveHighlight(highlightText, label);
  };

  const handlePickNativeFile = async () => {
    setExtractError(null);
    setIsProcessing(true);
    try {
      const res = await extractMutation.mutateAsync();
      if (!res) return;
      const fileName = res.sourceFileName || 'Resume';
      const lowerExt = fileName.split('.').pop()?.toLowerCase() || 'pdf';
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
            void handlePickNativeFile();
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

  const persistProfileUpdate = async (updated: UserProfileDto) => {
    try {
      if (dbProfile) {
        const res = await commands.profileSave(updated);
        if (res.status === 'error') {
          setExtractError(res.error);
          return;
        }
        await queryClient.invalidateQueries({ queryKey: ['profile'] });
      } else if (demoMode) {
        useProfileStore.setState({ profile: updated as any });
      }
      useApplicationStore.getState().syncWithProfile(updated as any);
      setConfirmToast(true);
      setTimeout(() => setConfirmToast(false), 2500);
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleConfirmProfile = () => {
    if (profile) {
      setIsConfirmed(true);
      useApplicationStore.getState().syncWithProfile(profile as any);
      setConfirmToast(true);
      setTimeout(() => setConfirmToast(false), 3500);
    }
  };

  const handleStartExplore = () => {
    if (!profile) return;
    useApplicationStore.getState().syncWithProfile(profile as any);
    void startDiscoveryStage({
      profile: profile as any,
      demoMode,
      onInvalidate: async () => {
        await queryClient.invalidateQueries({ queryKey: ['jobs'] });
        await queryClient.invalidateQueries({ queryKey: ['applications'] });
      },
    });
  };

  const handleCopyText = () => {
    if (uploadedDocumentText) {
      navigator.clipboard.writeText(uploadedDocumentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const validExperiences = (profile?.experiences || []).filter(
    (e) => Boolean(e.title) && Boolean(e.company) && e.company !== 'Company' && e.company !== 'Organization'
  );
  const missingFields: string[] = [];
  if (profile) {
    if (!profile.contact?.fullName) missingFields.push(t('profile.fullName'));
    if (!profile.contact?.email) missingFields.push(t('profile.email'));
    if (!profile.contact?.phone) missingFields.push(t('profile.phone'));
    if (!profile.summary) missingFields.push(t('profile.summary'));
    if (validExperiences.length === 0) missingFields.push(t('profile.experience'));
    if (!profile.skills || profile.skills.length === 0) missingFields.push(t('profile.skills'));
  }

  const completenessScore = profile
    ? Math.min(
        100,
        Math.round(
          (profile.contact?.fullName ? 20 : 0) +
          (profile.contact?.email ? 20 : 0) +
          (profile.contact?.phone ? 15 : 0) +
          (profile.summary ? 15 : 0) +
          (validExperiences.length > 0 ? 15 : 0) +
          (profile.skills && profile.skills.length > 0 ? 15 : 0)
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
                onClick={handleStartExplore}
                disabled={isPipelineRunning}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md fr-button-primary disabled:opacity-50 text-[11px] cursor-pointer"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>{t('profile.startExplore')}</span>
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
        /* Conceptual Rive-Style Vector Scanner & Orbiting Extraction Nodes */
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-xl fr-studio-panel p-8 flex flex-col items-center gap-6"
          >
            {/* Rive-Inspired Interactive Vector Stage */}
            <div className="relative w-44 h-44 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border border-dashed border-sky-500/30"
              />
              <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-4 rounded-full bg-sky-500/10 border border-sky-400/20"
              />

              {/* Document Silhouette */}
              <div className="relative w-20 h-24 rounded-xl bg-[#182230] border border-sky-400/40 shadow-lg flex flex-col justify-center gap-2 p-3 overflow-hidden">
                <div className="h-2 w-10 rounded bg-sky-400/60" />
                <div className="h-1.5 w-14 rounded bg-slate-600/80" />
                <div className="h-1.5 w-12 rounded bg-slate-600/80" />
                <div className="h-1.5 w-14 rounded bg-slate-600/80" />
                <div className="h-1.5 w-9 rounded bg-emerald-400/50" />
                {/* Animated Laser Beam */}
                <motion.div
                  animate={{ y: [-40, 48, -40] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_12px_#38bdf8]"
                />
              </div>

              {/* Orbiting Extraction Nodes */}
              <motion.div
                animate={{ y: [-3, 3, -3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-1 -end-2 px-2 py-1 rounded-full bg-[#162820] border border-emerald-500/40 text-[10px] font-mono text-emerald-300 shadow"
              >
                Skills
              </motion.div>
              <motion.div
                animate={{ y: [3, -3, 3] }}
                transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-1 -start-2 px-2 py-1 rounded-full bg-[#142336] border border-sky-500/40 text-[10px] font-mono text-sky-300 shadow"
              >
                Identity
              </motion.div>
            </div>

            <div className="text-center">
              <span className="fr-eyebrow block mb-1">LOCAL PARSER</span>
              <h3 className="text-sm font-bold text-[#f4f4f5]">{t('profile.parsing')}</h3>
            </div>

            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                onClick={handleStartExplore}
                disabled={isPipelineRunning}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl fr-button-primary disabled:opacity-50 text-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{t('profile.startExplore')}</span>
              </button>
            </motion.div>

            {/* Top Identity Card (Inline Editable) */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="fr-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                {editingIdentity ? (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      value={identityDraft.fullName}
                      onChange={(e) => setIdentityDraft((d) => ({ ...d, fullName: e.target.value }))}
                      placeholder={t('profile.fullName')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#141414] border border-sky-500/40 text-xs text-white focus:outline-none"
                    />
                    <input
                      value={identityDraft.targetTitle}
                      onChange={(e) => setIdentityDraft((d) => ({ ...d, targetTitle: e.target.value }))}
                      placeholder="Target Title"
                      className="px-2.5 py-1.5 rounded-lg bg-[#141414] border border-[#2f2f2f] text-xs text-white focus:outline-none"
                    />
                    <input
                      value={identityDraft.email}
                      onChange={(e) => setIdentityDraft((d) => ({ ...d, email: e.target.value }))}
                      placeholder={t('profile.email')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#141414] border border-[#2f2f2f] text-xs text-white font-mono focus:outline-none"
                    />
                    <input
                      dir="ltr"
                      value={identityDraft.phone}
                      onChange={(e) => setIdentityDraft((d) => ({ ...d, phone: e.target.value }))}
                      placeholder={t('profile.phone')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#141414] border border-[#2f2f2f] text-xs text-white font-mono focus:outline-none"
                    />
                    <input
                      value={identityDraft.location}
                      onChange={(e) => setIdentityDraft((d) => ({ ...d, location: e.target.value }))}
                      placeholder={t('profile.location')}
                      className="px-2.5 py-1.5 rounded-lg bg-[#141414] border border-[#2f2f2f] text-xs text-white focus:outline-none"
                    />
                    <input
                      dir="ltr"
                      value={identityDraft.linkedinUrl}
                      onChange={(e) => setIdentityDraft((d) => ({ ...d, linkedinUrl: e.target.value }))}
                      placeholder="LinkedIn URL"
                      className="px-2.5 py-1.5 rounded-lg bg-[#141414] border border-[#2f2f2f] text-xs text-white font-mono focus:outline-none"
                    />
                    <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setEditingIdentity(false)}
                        className="px-2.5 py-1 rounded-md bg-[#222222] text-xs text-[#a1a1aa] hover:text-white cursor-pointer"
                      >
                        {t('profile.cancelEdit')}
                      </button>
                      <button
                        onClick={() => {
                          const updated: UserProfileDto = {
                            ...(profile as any),
                            contact: {
                              ...(profile.contact as any),
                              fullName: identityDraft.fullName,
                              email: identityDraft.email,
                              phone: identityDraft.phone || null,
                              location: identityDraft.location || null,
                              linkedinUrl: identityDraft.linkedinUrl || null,
                            },
                            targetTitles: identityDraft.targetTitle
                              ? [identityDraft.targetTitle, ...(profile.targetTitles || []).slice(1)]
                              : profile.targetTitles || [],
                          };
                          setEditingIdentity(false);
                          void persistProfileUpdate(updated);
                        }}
                        className="px-3 py-1 rounded-md fr-button-primary text-xs cursor-pointer"
                      >
                        {t('profile.saveSection')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h2 className="text-base font-bold text-[#f4f4f5]">{profile.contact?.fullName}</h2>
                      <p className="text-xs text-[#a1a1aa] mt-0.5 font-mono">
                        {profile.targetTitles?.[0] || 'Software Engineer'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setIdentityDraft({
                            fullName: profile.contact?.fullName || '',
                            targetTitle: profile.targetTitles?.[0] || '',
                            email: profile.contact?.email || '',
                            phone: profile.contact?.phone || '',
                            location: profile.contact?.location || '',
                            linkedinUrl: profile.contact?.linkedinUrl || '',
                          });
                          setEditingIdentity(true);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#202020] hover:bg-[#2a2a2a] border border-[#2f2f2f] text-[10px] text-[#d4d4d8] cursor-pointer"
                      >
                        <Pencil className="w-3 h-3 text-sky-400" />
                        <span>{t('profile.editSection')}</span>
                      </button>
                      {isConfirmed && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-[#1b2b21] text-emerald-400 border border-emerald-500/20">
                          {t('profile.verified')}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Contact Grid */}
              {!editingIdentity && (
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
              )}
            </motion.div>

            {/* Summary (Inline Editable) */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="fr-card p-4 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider">
                  {t('profile.summary')}
                </span>
                {!editingSummary && (
                  <button
                    onClick={() => {
                      setSummaryDraft(profile.summary || '');
                      setEditingSummary(true);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#202020] hover:bg-[#2a2a2a] border border-[#2f2f2f] text-[10px] text-[#d4d4d8] cursor-pointer"
                  >
                    <Pencil className="w-3 h-3 text-sky-400" />
                    <span>{t('profile.editSection')}</span>
                  </button>
                )}
              </div>
              {editingSummary ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    rows={4}
                    value={summaryDraft}
                    onChange={(e) => setSummaryDraft(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-[#141414] border border-sky-500/40 text-xs text-[#e4e4e7] leading-relaxed focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingSummary(false)}
                      className="px-2.5 py-1 rounded-md bg-[#222222] text-xs text-[#a1a1aa] hover:text-white cursor-pointer"
                    >
                      {t('profile.cancelEdit')}
                    </button>
                    <button
                      onClick={() => {
                        const updated: UserProfileDto = { ...(profile as any), summary: summaryDraft || null };
                        setEditingSummary(false);
                        void persistProfileUpdate(updated);
                      }}
                      className="px-3 py-1 rounded-md fr-button-primary text-xs cursor-pointer"
                    >
                      {t('profile.saveSection')}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#d4d4d8] leading-relaxed">{profile.summary || '—'}</p>
              )}
            </motion.div>

            {/* Experiences List (Inline Editable) */}
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
                  {profile.experiences.map((exp) => {
                    const isEditing = editingExpId === exp.id;
                    return (
                      <div key={exp.id} className="p-3 rounded-lg bg-[#141414] border border-[#262626] flex flex-col gap-1.5">
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                value={expDraft.title}
                                onChange={(e) => setExpDraft((d) => ({ ...d, title: e.target.value }))}
                                placeholder="Role Title"
                                className="px-2.5 py-1.5 rounded bg-[#1a1a1a] border border-sky-500/40 text-xs text-white focus:outline-none"
                              />
                              <input
                                value={expDraft.company}
                                onChange={(e) => setExpDraft((d) => ({ ...d, company: e.target.value }))}
                                placeholder="Company"
                                className="px-2.5 py-1.5 rounded bg-[#1a1a1a] border border-[#2f2f2f] text-xs text-white focus:outline-none"
                              />
                              <input
                                value={expDraft.startDate}
                                onChange={(e) => setExpDraft((d) => ({ ...d, startDate: e.target.value }))}
                                placeholder="Start Date"
                                className="px-2.5 py-1.5 rounded bg-[#1a1a1a] border border-[#2f2f2f] text-xs text-white font-mono focus:outline-none"
                              />
                              <input
                                value={expDraft.endDate}
                                onChange={(e) => setExpDraft((d) => ({ ...d, endDate: e.target.value }))}
                                placeholder="End Date / Present"
                                className="px-2.5 py-1.5 rounded bg-[#1a1a1a] border border-[#2f2f2f] text-xs text-white font-mono focus:outline-none"
                              />
                            </div>
                            <textarea
                              rows={3}
                              value={expDraft.achievementsText}
                              onChange={(e) => setExpDraft((d) => ({ ...d, achievementsText: e.target.value }))}
                              className="w-full p-2 rounded bg-[#1a1a1a] border border-[#2f2f2f] text-xs text-[#e4e4e7] focus:outline-none"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingExpId(null)}
                                className="px-2.5 py-1 rounded bg-[#222222] text-xs text-[#a1a1aa] hover:text-white cursor-pointer"
                              >
                                {t('profile.cancelEdit')}
                              </button>
                              <button
                                onClick={() => {
                                  const updatedExps = (profile.experiences || []).map((item) =>
                                    item.id === exp.id
                                      ? {
                                          ...item,
                                          title: expDraft.title,
                                          company: expDraft.company,
                                          location: expDraft.location || null,
                                          startDate: expDraft.startDate,
                                          endDate: expDraft.endDate || null,
                                          achievements: expDraft.achievementsText
                                            .split('\n')
                                            .map((s) => s.trim())
                                            .filter(Boolean),
                                        }
                                      : item
                                  );
                                  setEditingExpId(null);
                                  void persistProfileUpdate({ ...(profile as any), experiences: updatedExps });
                                }}
                                className="px-3 py-1 rounded fr-button-primary text-xs cursor-pointer"
                              >
                                {t('profile.saveSection')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-white">{exp.title}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-[#71717a]">
                                  {exp.startDate} - {exp.isCurrent ? 'Present' : exp.endDate || ''}
                                </span>
                                <button
                                  onClick={() => {
                                    setExpDraft({
                                      title: exp.title || '',
                                      company: exp.company || '',
                                      location: exp.location || '',
                                      startDate: exp.startDate || '',
                                      endDate: exp.endDate || '',
                                      achievementsText: (exp.achievements || []).join('\n'),
                                    });
                                    setEditingExpId(exp.id);
                                  }}
                                  className="p-1 rounded hover:bg-[#222222] text-[#71717a] hover:text-sky-400 cursor-pointer"
                                  title={t('profile.editSection')}
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <span className="text-[11px] text-sky-400 font-medium">
                              {exp.company} {exp.location ? `· ${exp.location}` : ''}
                            </span>
                            {exp.achievements && exp.achievements.length > 0 && (
                              <ul className="list-disc list-inside text-[11px] text-[#a1a1aa] flex flex-col gap-1 mt-1">
                                {exp.achievements.map((ach, i) => (
                                  <li key={i}>{ach}</li>
                                ))}
                              </ul>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Skills Badges (Inline Add / Remove) */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.34, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="fr-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('profile.skills')} ({profile.skills?.length || 0})</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    value={newSkillName}
                    onChange={(e) => setNewSkillName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSkillName.trim()) {
                        const trimmed = newSkillName.trim();
                        const nextSkills = [
                          ...(profile.skills || []),
                          { id: `sk_${Date.now()}`, name: trimmed },
                        ];
                        setNewSkillName('');
                        void persistProfileUpdate({ ...(profile as any), skills: nextSkills });
                      }
                    }}
                    placeholder={t('profile.addSkillPlaceholder')}
                    className="px-2.5 py-1 rounded-md bg-[#141414] border border-[#2f2f2f] text-[11px] text-white placeholder:text-[#71717a] focus:outline-none focus:border-sky-500/50"
                  />
                  <button
                    onClick={() => {
                      if (!newSkillName.trim()) return;
                      const trimmed = newSkillName.trim();
                      const nextSkills = [
                        ...(profile.skills || []),
                        { id: `sk_${Date.now()}`, name: trimmed },
                      ];
                      setNewSkillName('');
                      void persistProfileUpdate({ ...(profile as any), skills: nextSkills });
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#202020] hover:bg-[#2a2a2a] border border-[#2f2f2f] text-[11px] text-sky-400 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t('profile.addSkill')}</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(profile.skills || []).map((s, idx) => (
                  <motion.span
                    key={s.id}
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: 0.26 + Math.min(idx, 18) * 0.025 }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#141414] border border-[#2b2b2b] hover:border-sky-500/40 text-[#e4e4e7] transition-colors"
                  >
                    <span>{s.name}</span>
                    <button
                      onClick={() => {
                        const nextSkills = (profile.skills || []).filter((item) => item.id !== s.id);
                        void persistProfileUpdate({ ...(profile as any), skills: nextSkills });
                      }}
                      className="text-[#71717a] hover:text-rose-400 cursor-pointer"
                      aria-label={`Remove ${s.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                ))}
              </div>
            </motion.div>

            {/* Education Card */}
            {profile.education && profile.education.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.34, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="fr-card p-4 flex flex-col gap-2.5"
              >
                <span className="text-[11px] font-semibold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('profile.education')} ({profile.education.length})</span>
                </span>
                <div className="flex flex-col gap-2">
                  {profile.education.map((edu) => (
                    <div key={edu.id} className="p-2.5 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-white block">{edu.institution}</span>
                        <span className="text-[11px] text-[#a1a1aa]">
                          {edu.degree} {edu.fieldOfStudy ? `· ${edu.fieldOfStudy}` : ''}
                        </span>
                      </div>
                      {(edu.startDate || edu.endDate) && (
                        <span className="text-[10px] font-mono text-[#71717a]">
                          {edu.startDate || ''} {edu.endDate ? `- ${edu.endDate}` : ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column: Readable CV Sections & Raw Text Inspector */}
          <div className="h-full overflow-y-auto p-5 flex flex-col gap-4 bg-[#141414]">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#242424] gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-[#1a1a1a] p-1 rounded-lg border border-[#282828]">
                <button
                  onClick={() => setRightTab('readable')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                    rightTab === 'readable' ? 'bg-sky-600 text-white' : 'text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  {t('profile.structuredPreview')}
                </button>
                <button
                  onClick={() => setRightTab('raw')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                    rightTab === 'raw' ? 'bg-sky-600 text-white' : 'text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  {t('profile.rawSource')}
                </button>
              </div>
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2.5 py-1 rounded bg-[#202020] border border-[#2e2e2e] cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {rightTab === 'readable' ? (
              <div className="rounded-2xl border border-[#282828] bg-[#181818] p-6 flex flex-col gap-5 text-start leading-relaxed shadow-sm">
                <div className="border-b border-[#262626] pb-4">
                  <h3 className="text-lg font-bold text-white">{profile.contact?.fullName}</h3>
                  <p className="text-xs text-sky-400 mt-0.5">{profile.targetTitles?.[0] || ''}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-[#a1a1aa]">
                    <span>{profile.contact?.email}</span>
                    {profile.contact?.phone && <span dir="ltr">{profile.contact.phone}</span>}
                    {profile.contact?.location && <span>{profile.contact.location}</span>}
                  </div>
                </div>

                {profile.summary && (
                  <div>
                    <h4 className="fr-eyebrow mb-1.5">{t('profile.summary')}</h4>
                    <p className="text-xs text-[#d4d4d8] leading-6">{profile.summary}</p>
                  </div>
                )}

                {profile.skills && profile.skills.length > 0 && (
                  <div>
                    <h4 className="fr-eyebrow mb-2">{t('profile.skills')}</h4>
                    <p className="text-xs text-[#e4e4e7] leading-6">
                      {profile.skills.map((s) => s.name).join('  •  ')}
                    </p>
                  </div>
                )}

                {profile.experiences && profile.experiences.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <h4 className="fr-eyebrow">{t('profile.experience')}</h4>
                    {profile.experiences.map((exp) => (
                      <div key={exp.id} className="border-s-2 border-sky-500/40 ps-3 flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white">{exp.title} — {exp.company}</span>
                          <span className="text-[10px] font-mono text-[#71717a]">{exp.startDate} - {exp.isCurrent ? 'Present' : exp.endDate || ''}</span>
                        </div>
                        {exp.achievements?.map((ach, i) => (
                          <p key={i} className="text-[11px] text-[#a1a1aa] leading-5">• {ach}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {profile.education && profile.education.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h4 className="fr-eyebrow">{t('profile.education')}</h4>
                    {profile.education.map((edu) => (
                      <p key={edu.id} className="text-xs text-[#d4d4d8]">
                        {edu.institution} — {edu.degree} {edu.fieldOfStudy ? `(${edu.fieldOfStudy})` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <pre className="text-xs font-mono text-[#a1a1aa] whitespace-pre-wrap leading-relaxed select-text">
                {uploadedDocumentText || 'Raw extracted resume text will appear here.'}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
