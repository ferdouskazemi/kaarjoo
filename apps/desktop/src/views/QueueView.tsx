import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Play,
  Send,
  Trash2,
  Eye,
  FileText,
  Building2,
  Clock,
  Sparkles,
  Lock,
  Loader2,
  Maximize2,
  X,
  Compass,
  UserCheck,
} from 'lucide-react';
import { useApplications, useExecuteReview, useSubmitApplication, useUpdateApplicationStatus, useProfile } from '../queries/index.js';
import { useApplicationStore } from '../stores/applicationStore.js';
import { useProfileStore } from '../stores/profileStore.js';
import { useAppStore } from '../stores/appStore.js';
import { formatNumber } from '../utils/formatters.js';
import type { ApplicationRecord, AtsType } from '@kaarjoo/shared';

export const QueueView: React.FC = () => {
  const { t, i18n } = useTranslation();

  const { demoMode } = useAppStore();
  const { data: dbApplications = [], refetch: refetchApps } = useApplications();
  const { data: dbProfile } = useProfile();
  const { profile: demoProfile } = useProfileStore();
  const profile = dbProfile ?? (demoMode ? demoProfile : null);
  const executeReviewMutation = useExecuteReview();
  const submitAppMutation = useSubmitApplication();
  const updateStatusMutation = useUpdateApplicationStatus();

  const {
    applications: storeApps,
    activeApplicationId,
    setActiveApplicationId,
    loadDemoApplications,
    cancelApplication,
    executeApplication,
    submitReviewed,
    isExecuting: storeIsExecuting,
  } = useApplicationStore();

  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Applications list: database records take precedence, falling back to store apps in demo mode
  const applications: ApplicationRecord[] = (dbApplications.length > 0
    ? dbApplications.map((a) => ({
        id: a.id,
        jobId: a.jobId,
        jobTitle: a.jobTitle,
        company: a.company,
        location: a.location ?? undefined,
        applyUrl: a.applyUrl,
        atsType: (a.atsType as AtsType) ?? 'generic',
        mode: (a.mode as any) ?? 'review',
        status: (a.status as any) ?? 'queued',
        matchScore: a.matchScore ?? undefined,
        profileId: a.profileId,
        tailoredResumePath: a.tailoredResumePath ?? undefined,
        coverLetterText: a.coverLetterText ?? undefined,
        notes: a.notes ?? undefined,
        interviewDate: a.interviewDate ?? undefined,
        submittedAt: a.submittedAt ?? undefined,
        screenshotBeforeSubmit: a.screenshotBeforeSubmit ?? undefined,
        screenshotConfirmation: a.screenshotConfirmation ?? undefined,
        filledFields: a.filledFields as any,
        reviewChecklist: a.reviewChecklist as any,
        timeline: a.timeline as any,
        stopReason: 'none',
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }))
    : (demoMode || storeApps.length > 0)
    ? storeApps
    : []) as ApplicationRecord[];

  const activeApp: ApplicationRecord | undefined =
    applications.find((a) => a.id === activeApplicationId) || applications[0];

  const isUsingDb = dbApplications.length > 0;
  const isExecuting = executeReviewMutation.isPending || storeIsExecuting;

  const handleExecute = async (id: string) => {
    setActionError(null);
    try {
      if (isUsingDb) {
        await executeReviewMutation.mutateAsync(id);
        await refetchApps();
      } else {
        await executeApplication(id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
    }
  };

  const handleSubmit = async (id: string) => {
    setActionError(null);
    try {
      if (isUsingDb) {
        await submitAppMutation.mutateAsync(id);
        await refetchApps();
      } else {
        await submitReviewed(id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
    }
  };

  const handleRemove = async (id: string) => {
    setActionError(null);
    try {
      if (isUsingDb) {
        await updateStatusMutation.mutateAsync({ id, status: 'withdrawn' });
        await refetchApps();
      } else {
        cancelApplication(id);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setActionError(msg);
    }
  };

  const getStatusBadge = (status: ApplicationRecord['status']) => {
    switch (status) {
      case 'needs_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#2b2414] text-amber-300 border border-amber-500/40 font-mono">
            <Eye className="w-3 h-3 text-amber-400" />
            {t('status.needs_review')}
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#142332] text-sky-300 border border-sky-500/40 font-mono">
            <Clock className="w-3 h-3 text-sky-400" />
            {t('status.queued')}
          </span>
        );
      case 'filling':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#1e1c36] text-violet-300 border border-violet-500/40 animate-pulse font-mono">
            <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
            {t('status.filling')}
          </span>
        );
      case 'submitted':
      case 'submitted_verified':
      case 'submitted_unverified':
      case 'applied':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#182a20] text-emerald-300 border border-emerald-500/40 font-mono">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            {t('status.applied')}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#2b1717] text-rose-300 border border-rose-500/40 font-mono">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            {t('common.error')}
          </span>
        );
      case 'needs_user':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#2b1717] text-rose-300 border border-rose-500/40 font-mono">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            {t('status.needs_user')}
          </span>
        );
      case 'saved':
      case 'interview':
      case 'offer':
      case 'rejected':
      case 'withdrawn':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#1a1a1a] text-slate-300 border border-slate-700 font-mono">
            {t(`status.${status}`)}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#1a1a1a] text-slate-400 border border-slate-700 font-mono">
            {status}
          </span>
        );
    }
  };

  const getAtsBadge = (ats: AtsType) => {
    const map: Partial<Record<AtsType, { bg: string; text: string; border: string }>> = {
      greenhouse: { bg: 'bg-[#12281e]', text: 'text-emerald-400', border: 'border-emerald-600/30' },
      lever: { bg: 'bg-[#142334]', text: 'text-blue-400', border: 'border-blue-600/30' },
      ashby: { bg: 'bg-[#221634]', text: 'text-purple-400', border: 'border-purple-600/30' },
      workable: { bg: 'bg-[#122828]', text: 'text-teal-400', border: 'border-teal-600/30' },
      generic: { bg: 'bg-[#1c1c1c]', text: 'text-slate-400', border: 'border-slate-700/50' },
    };
    const c = map[ats] || map.generic!;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${c.bg} ${c.text} border ${c.border}`}>
        {ats}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full text-[#f4f4f5]">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#282828]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-[#f4f4f5]">{t('queue.title')}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/30">
              {formatNumber(applications.length, i18n.language)} {t('queue.openings')}
            </span>
          </div>
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            {t('queue.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a1a1a] border border-[#2b2b2b] text-[11px] font-medium text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{t('queue.reviewMode')}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a1a1a] border border-[#2b2b2b] text-[11px] font-medium text-[#a1a1aa] font-mono">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>{t('queue.ethicalGuard')}</span>
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        /* Empty State */
        <div className="rounded-2xl border border-[#282828] bg-[#161616] p-16 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
          <Clock className="w-12 h-12 text-[#52525b] mb-4" />
          <h3 className="text-base font-semibold text-[#f4f4f5] mb-1">
            {t('queue.emptyTitle')}
          </h3>
          <p className="text-xs text-[#a1a1aa] max-w-sm mb-6 leading-relaxed">
            {t('queue.emptyDesc')}
          </p>

          {demoMode && (
            <button
              onClick={() => loadDemoApplications()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('queue.loadDemo')}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Applications List (Cards) */}
          <div className="lg:col-span-4 flex flex-col gap-2.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#a1a1aa] px-1">
              {t('queue.queuedApps')} ({formatNumber(applications.length, i18n.language)})
            </h2>

            <div className="flex flex-col gap-2">
              {applications.map((app) => {
                const isSelected = app.id === activeApp?.id;
                return (
                  <div
                    key={app.id}
                    onClick={() => setActiveApplicationId(app.id)}
                    className={`cursor-pointer rounded-xl p-3.5 border transition-all text-start ${
                      isSelected
                        ? 'bg-[#1e1e1e] border-sky-500/50 shadow-lg active-ring'
                        : 'bg-[#161616] border-[#262626] hover:border-[#383838] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#a1a1aa]" />
                        <span className="text-xs font-semibold text-[#f4f4f5]">{app.company}</span>
                      </div>
                      {getAtsBadge(app.atsType)}
                    </div>

                    <h3 className="text-xs font-medium text-[#e4e4e7] line-clamp-1 mb-2">
                      {app.jobTitle}
                    </h3>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#242424]">
                      {getStatusBadge(app.status)}
                      <span className="text-[10px] font-mono text-[#71717a]">
                        {app.reviewChecklist?.length > 0
                          ? `${formatNumber(app.reviewChecklist.length, i18n.language)} ${t('queue.fieldsCount')}`
                          : t('queue.ready')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Application Inspection & Approval View */}
          {activeApp && (
            <div className="lg:col-span-8 rounded-2xl border border-[#282828] bg-[#161616] p-5 flex flex-col gap-5 shadow-sm">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#242424]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[#a1a1aa]">{activeApp.company}</span>
                    <span className="text-[#383838]">•</span>
                    {getAtsBadge(activeApp.atsType)}
                    <span className="text-[#383838]">•</span>
                    {getStatusBadge(activeApp.status)}
                  </div>
                  <h2 className="text-base font-bold text-[#f4f4f5]">{activeApp.jobTitle}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={activeApp.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#202020] hover:bg-[#282828] border border-[#2f2f2f] text-[#d4d4d8] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                    {t('queue.viewPosting')}
                  </a>
                  <button
                    onClick={() => handleRemove(activeApp.id)}
                    className="p-1.5 rounded-lg text-[#71717a] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title={t('queue.remove')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {actionError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2 text-xs text-rose-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                  <button
                    onClick={() => setActionError(null)}
                    className="text-rose-400 hover:text-rose-200 cursor-pointer"
                    aria-label={t('common.close')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Execution Progress Bar */}
              {isExecuting && (
                <div className="p-3.5 rounded-xl bg-[#12222d] border border-sky-500/30 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-sky-300 block mb-0.5">
                      {t('queue.executing')}
                    </span>
                    <span className="text-[#a1a1aa] font-mono text-[11px]">
                      {activeApp.applyUrl}
                    </span>
                  </div>
                </div>
              )}

              {/* Main Content: Screenshot & Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Browser Snapshot Thumbnail */}
                <div className="md:col-span-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#d4d4d8] flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-sky-400" />
                      {t('queue.liveSnapshot')}
                    </span>
                    {activeApp.screenshotBeforeSubmit && (
                      <button
                        onClick={() => setPreviewModalImg(activeApp.screenshotBeforeSubmit || null)}
                        className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Maximize2 className="w-3 h-3" />
                        {t('queue.expand')}
                      </button>
                    )}
                  </div>

                  <div
                    onClick={() => activeApp.screenshotBeforeSubmit && setPreviewModalImg(activeApp.screenshotBeforeSubmit)}
                    className="relative rounded-xl border border-[#282828] overflow-hidden bg-[#111111] group cursor-pointer aspect-video flex items-center justify-center"
                  >
                    {activeApp.screenshotBeforeSubmit ? (
                      <>
                        <img
                          src={activeApp.screenshotBeforeSubmit}
                          alt="Browser snapshot"
                          className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/90 via-transparent to-transparent flex items-end p-2.5">
                          <span className="text-[10px] text-[#f4f4f5] font-mono bg-[#161616]/90 px-2 py-0.5 rounded border border-[#2b2b2b]">
                            {t('queue.finalStep')}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-6 text-center flex flex-col items-center justify-center text-[#52525b]">
                        <Compass className="w-8 h-8 mb-2 stroke-1" />
                        <span className="text-xs">
                          {t('queue.snapshotPlaceholder')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Verification Checklist */}
                <div className="md:col-span-7 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#d4d4d8] flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      {t('queue.checklist')}
                    </span>
                    <span className="text-[11px] font-mono text-[#71717a]">
                      {formatNumber(4, i18n.language)} {t('queue.itemsCount')}
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#282828] bg-[#141414] p-3 flex flex-col gap-2 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-[#222222]">
                      <span className="text-[11px] text-[#71717a] uppercase font-mono">{t('profile.fullName')}</span>
                      <span className="text-[11px] font-medium text-white">{profile?.contact?.fullName || '—'}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-[#222222]">
                      <span className="text-[11px] text-[#71717a] uppercase font-mono">{t('profile.email')}</span>
                      <span className="text-[11px] font-medium text-sky-400 font-mono">{profile?.contact?.email || '—'}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-[#222222]">
                      <span className="text-[11px] text-[#71717a] uppercase font-mono">{t('profile.phone')}</span>
                      <span dir="ltr" className="text-[11px] font-medium text-white font-mono">{profile?.contact?.phone || '—'}</span>
                    </div>

                    <div className="flex items-center justify-between py-1.5">
                      <span className="text-[11px] text-[#71717a] uppercase font-mono">{t('documents.tailoredResumePdf')}</span>
                      <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        <span>{activeApp.tailoredResumePath || 'Tailored_Resume.pdf'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#242424]">
                {activeApp.status === 'queued' || activeApp.status === 'saved' ? (
                  <button
                    onClick={() => handleExecute(activeApp.id)}
                    disabled={isExecuting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{t('queue.startFilling')}</span>
                  </button>
                ) : activeApp.status === 'needs_review' ? (
                  <button
                    onClick={() => handleSubmit(activeApp.id)}
                    disabled={submitAppMutation.isPending}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{t('queue.approveSubmit')}</span>
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Snapshot Preview Lightbox */}
      {previewModalImg && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm">
          <button
            onClick={() => setPreviewModalImg(null)}
            className="absolute top-6 end-6 text-white hover:text-slate-300 p-2 rounded-xl bg-slate-900 border border-slate-800"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewModalImg}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl border border-slate-800"
          />
        </div>
      )}
    </div>
  );
};
