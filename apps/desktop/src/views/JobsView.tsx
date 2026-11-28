import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import {
  Briefcase,
  Search,
  RefreshCw,
  Loader2,
  FileText,
  ArrowLeft,
  ArrowRight,
  Check,
  Undo2,
  Building2,
  UploadCloud,
} from 'lucide-react';
import { JobCard, type DisplayJob } from '../components/jobs/JobCard.js';
import { JobDetailDrawer } from '../components/jobs/JobDetailDrawer.js';
import { CompanyBoardsModal } from '../components/jobs/CompanyBoardsModal.js';
import { TailoredDocumentsModal } from '../components/documents/TailoredDocumentsModal.js';
import { useApplicationStore } from '../stores/applicationStore.js';
import { useAppStore } from '../stores/appStore.js';
import { useProfileStore } from '../stores/profileStore.js';
import { useProfile, useJobs, useCreateApplication } from '../queries/index.js';
import { commands } from '../bindings.js';
import { formatNumber } from '../utils/formatters.js';
import { focusSwipeVariants } from '../styles/motion.js';
import { Tabs } from '../components/ui/Tabs.js';
import { Button } from '../components/ui/Button.js';
import { ScoreRing } from '../components/ui/ScoreRing.js';
import { Badge } from '../components/ui/Badge.js';
import { KeyboardHint } from '../components/ui/KeyboardHint.js';
import type { CompanyBoard, AtsType } from '@kaarjoo/shared';

export const JobsView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { setCurrentView, demoMode } = useAppStore();
  const { queueJobApplication } = useApplicationStore();
  const { profile: demoProfile } = useProfileStore();

  const { data: dbProfile, isLoading: isProfileLoading } = useProfile();
  const profile = dbProfile ?? (demoMode ? demoProfile : null);
  const { data: dbJobs = [], isError: isJobsError, refetch: refetchJobs } = useJobs();
  const createApplication = useCreateApplication();

  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<DisplayJob | null>(null);
  const [tailoringJob, setTailoringJob] = useState<DisplayJob | null>(null);
  const [isBoardsModalOpen, setIsBoardsModalOpen] = useState(false);
  const [isTailoringModalOpen, setIsTailoringModalOpen] = useState(false);
  const [companyBoards, setCompanyBoards] = useState<CompanyBoard[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<'all' | 'us' | 'eu' | 'remote'>('all');
  const [remoteFilter, setRemoteFilter] = useState<'all' | 'remote' | 'hybrid' | 'on-site'>('all');
  const [atsFilter, setAtsFilter] = useState<'all' | AtsType>('all');
  const [stackFilter, setStackFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'for_you' | 'new' | 'shortlisted' | 'skipped'>('for_you');
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(() => new Set());
  const [skippedIds, setSkippedIds] = useState<Set<string>>(() => new Set());
  const [isPreparingShortlist, setIsPreparingShortlist] = useState(false);
  const [swipeDir, setSwipeDir] = useState<number>(1);
  const [undoToast, setUndoToast] = useState<{ jobId: string; title: string; action: 'keep' | 'skip' } | null>(null);

  useEffect(() => {
    if (!undoToast) return;
    const timer = setTimeout(() => setUndoToast(null), 5000);
    return () => clearTimeout(timer);
  }, [undoToast]);

  const handleKeepFocusJob = (job: DisplayJob) => {
    setSwipeDir(1);
    setShortlistedIds((prev) => new Set(prev).add(job.id));
    setSkippedIds((prev) => {
      const next = new Set(prev);
      next.delete(job.id);
      return next;
    });
    setUndoToast({ jobId: job.id, title: job.title, action: 'keep' });
  };

  const handleUndo = () => {
    if (!undoToast) return;
    const { jobId } = undoToast;
    setShortlistedIds((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
    setSkippedIds((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
    setUndoToast(null);
  };

  const toggleShortlist = (jobId: string) => {
    setShortlistedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
    setSkippedIds((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
  };

  const handleSkipJob = async (jobId: string) => {
    setSkippedIds((prev) => new Set(prev).add(jobId));
    setShortlistedIds((prev) => {
      const next = new Set(prev);
      next.delete(jobId);
      return next;
    });
    try {
      await commands.matchingRecordFeedback(jobId, 'irrelevant');
    } catch {
      // ignore if job is not in DB
    }
  };

  const handlePrepareShortlisted = async () => {
    if (shortlistedIds.size === 0) return;
    setIsPreparingShortlist(true);
    try {
      const selected = displayJobs.filter((j) => shortlistedIds.has(j.id));
      for (const job of selected) {
        await createApplication.mutateAsync({
          jobId: job.id,
          mode: 'review',
          resumePath: null,
          coverLetter: null,
        });
      }
      setCurrentView('queue');
    } finally {
      setIsPreparingShortlist(false);
    }
  };

  const [syncError, setSyncError] = useState<string | null>(null);

  // Live crawl via Node engine sidecar & Rust core
  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const keywords = profile?.skills?.map((s) => s.name).slice(0, 5) || null;
      const res = await commands.jobsSearch({
        keywords,
        locations: null,
        remoteOnly: null,
        company: null,
        atsType: null,
        limit: 50,
      });
      if (res.status === 'error') {
        setSyncError(res.error);
      } else if (
        res.data.sources.length > 0 &&
        res.data.sources.every((s) => s.status === 'failed') &&
        res.data.jobs.length === 0
      ) {
        setSyncError(t('jobs.networkErrorDesc'));
      }
      await refetchJobs();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : t('jobs.networkErrorDesc'));
      console.error('Failed to sync live jobs:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const displayJobs: DisplayJob[] = useMemo(() => {
    if (dbJobs.length > 0) {
      return dbJobs.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location ?? undefined,
        remoteType: (j.remoteType as any) ?? 'remote',
        atsType: (j.atsType as AtsType) ?? 'generic',
        applyUrl: j.applyUrl,
        postedAt: j.postedAt ?? undefined,
        descriptionMarkdown: j.descriptionMarkdown,
        requirements: j.requirements,
        matchScore: j.matchScore ? Math.round(j.matchScore) : undefined,
      }));
    }
    if (demoMode) {
      return [
        {
          id: 'demo_job_stripe',
          title: 'Senior Frontend Engineer (React & TypeScript)',
          company: 'Stripe',
          location: 'Remote (Global)',
          remoteType: 'remote',
          atsType: 'greenhouse',
          applyUrl: 'https://boards.greenhouse.io/stripe/jobs/demo-1',
          postedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          descriptionMarkdown: 'Build accessible, high-performance financial dashboards using React, TypeScript, and modern CSS.',
          requirements: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'],
          matchScore: 92,
        },
        {
          id: 'demo_job_gitlab',
          title: 'Frontend Engineer, Plan',
          company: 'GitLab',
          location: 'Remote (EMEA / Global)',
          remoteType: 'remote',
          atsType: 'greenhouse',
          applyUrl: 'https://job-boards.greenhouse.io/gitlab/jobs/demo-2',
          postedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          descriptionMarkdown: 'Collaborate on GitLab planning workflows with TypeScript, CI/CD pipelines, and responsive UI components.',
          requirements: ['JavaScript', 'TypeScript', 'Git', 'CI/CD'],
          matchScore: 86,
        },
      ];
    }
    return [];
  }, [dbJobs, demoMode]);

  const filteredJobs = useMemo(() => {
    return displayJobs.filter((job) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(q);
        const matchesCompany = job.company.toLowerCase().includes(q);
        const matchesLocation = (job.location || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesCompany && !matchesLocation) {
          return false;
        }
      }

      if (regionFilter === 'us') {
        const loc = (job.location || '').toLowerCase();
        if (!loc.includes('us') && !loc.includes('united states') && !loc.includes('san francisco') && !loc.includes('ca')) {
          return false;
        }
      } else if (regionFilter === 'eu') {
        const loc = (job.location || '').toLowerCase();
        if (!loc.includes('eu') && !loc.includes('europe') && !loc.includes('sweden') && !loc.includes('germany') && !loc.includes('uk')) {
          return false;
        }
      } else if (regionFilter === 'remote') {
        if (job.remoteType !== 'remote') return false;
      }

      if (remoteFilter !== 'all' && job.remoteType !== remoteFilter) {
        return false;
      }

      if (stackFilter !== 'all') {
        const textToSearch = `${job.title} ${job.descriptionMarkdown || ''}`.toLowerCase();
        if (stackFilter === 'frontend' && !textToSearch.includes('frontend') && !textToSearch.includes('front-end') && !textToSearch.includes('react')) return false;
        if (stackFilter === 'fullstack' && !textToSearch.includes('fullstack') && !textToSearch.includes('full-stack') && !textToSearch.includes('software')) return false;
        if (stackFilter === 'typescript' && !textToSearch.includes('typescript') && !textToSearch.includes('javascript')) return false;
        if (stackFilter === 'design' && !textToSearch.includes('design') && !textToSearch.includes('ui/ux') && !textToSearch.includes('figma')) return false;
      }

      if (atsFilter !== 'all' && job.atsType !== atsFilter) {
        return false;
      }

      if (activeTab === 'shortlisted' && !shortlistedIds.has(job.id)) return false;
      if (activeTab === 'skipped' && !skippedIds.has(job.id)) return false;
      if (activeTab === 'for_you' && (shortlistedIds.has(job.id) || skippedIds.has(job.id))) return false;

      return true;
    });
  }, [displayJobs, searchQuery, regionFilter, remoteFilter, atsFilter, stackFilter, activeTab, shortlistedIds, skippedIds]);

  const handleApply = (job: DisplayJob) => {
    setSelectedJob(null);
    setTailoringJob(job);
    setIsTailoringModalOpen(true);
  };

  // 1. Wait for profile check before rendering jobs list to avoid flash
  if (isProfileLoading && !profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
      </div>
    );
  }

  // 2. If user has no profile, show clean empty state prompting résumé upload
  if (!profile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-sky-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">
          {t('jobs.uploadResumeFirst')}
        </h2>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          {t('jobs.uploadResumeDesc')}
        </p>
        <button
          onClick={() => setCurrentView('profile')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-sm transition-colors shadow-lg shadow-sky-600/20 cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{t('jobs.goToProfile')}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Top Banner / Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-100">{t('jobs.title')}</h1>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {formatNumber(displayJobs.length, i18n.language)} {t('queue.openings')}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {t('jobs.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-stretch sm:self-auto">
          <Button variant="secondary" size="sm" onClick={() => setIsBoardsModalOpen(true)}>
            <Building2 className="w-4 h-4" aria-hidden="true" />
            <span>Sources</span>
          </Button>
          <Button variant="primary" size="sm" loading={isSyncing} onClick={handleSync}>
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isSyncing ? t('jobs.syncing') : t('jobs.syncFeed')}</span>
          </Button>
        </div>
      </div>

      {/* Opportunities Tabs & Prepare Bulk Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel="Opportunities tabs"
          items={[
            {
              id: 'for_you',
              label: 'For you',
              count: displayJobs.filter((j) => !shortlistedIds.has(j.id) && !skippedIds.has(j.id)).length,
            },
            {
              id: 'new',
              label: 'All jobs',
              count: displayJobs.length,
            },
            { id: 'shortlisted', label: 'Kept', count: shortlistedIds.size },
            { id: 'skipped', label: 'Skipped', count: skippedIds.size },
          ]}
        />
        {shortlistedIds.size > 0 && (
          <Button
            variant="primary"
            size="sm"
            loading={isPreparingShortlist}
            onClick={() => void handlePrepareShortlisted()}
          >
            <span>Prepare {formatNumber(shortlistedIds.size, i18n.language)} shortlisted →</span>
          </Button>
        )}
      </div>

      {/* Filter and Refinement Bar */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-4 flex flex-col gap-3">
        {/* Row 1: Search & Region Buttons */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('jobs.searchPlaceholder')}
              className="w-full ps-9 pe-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Region Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            {(['all', 'us', 'eu', 'remote'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRegionFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  regionFilter === r
                    ? 'bg-slate-800 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r === 'all'
                  ? t('jobs.allRegions')
                  : r === 'us'
                    ? t('jobs.us')
                    : r === 'eu'
                      ? t('jobs.europe')
                      : t('jobs.remoteOnly')}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Tech Stack Filter Ribbon */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/40">
          <span className="text-[11px] text-slate-400 font-medium me-1">
            {t('jobs.stackLabel')}
          </span>
          {[
            { id: 'all', label: t('jobs.allRoles') },
            { id: 'frontend', label: 'Frontend' },
            { id: 'typescript', label: 'TypeScript' },
            { id: 'fullstack', label: 'Fullstack' },
            { id: 'design', label: 'Design' },
          ].map((stack) => (
            <button
              key={stack.id}
              onClick={() => setStackFilter(stack.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                stackFilter === stack.id
                  ? 'bg-sky-600 text-white font-semibold shadow-xs active-ring'
                  : 'bg-slate-950/80 border border-slate-800/80 text-slate-300 hover:text-white hover:border-slate-700'
              }`}
            >
              {stack.label}
            </button>
          ))}
        </div>

        {/* Row 2: Secondary Filter Pills */}
        <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Workplace / Remote Type */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 me-1">{t('jobs.workplace')}</span>
              {(['all', 'remote', 'hybrid', 'on-site'] as const).map((rt) => (
                <button
                  key={rt}
                  onClick={() => setRemoteFilter(rt)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border cursor-pointer ${
                    remoteFilter === rt
                      ? 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {rt === 'all'
                    ? t('jobs.allTypes')
                    : rt === 'remote'
                      ? t('jobs.remoteOnly')
                      : rt === 'hybrid'
                        ? t('jobs.hybrid')
                        : t('jobs.onSite')}
                </button>
              ))}
            </div>

            {/* ATS Provider Filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 me-1">ATS:</span>
              {(['all', 'greenhouse', 'lever', 'ashby', 'workable'] as const).map((ats) => (
                <button
                  key={ats}
                  onClick={() => setAtsFilter(ats)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono uppercase transition-colors border cursor-pointer ${
                    atsFilter === ats
                      ? 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {ats === 'all' ? t('jobs.allTypes') : ats}
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs text-slate-500 font-medium font-mono">
            {t('jobs.showing')} {formatNumber(filteredJobs.length, i18n.language)} {t('queue.openings')}
          </span>
        </div>
      </div>

      {/* Job Cards Feed or Empty State */}
      {isSyncing ? (
        <div className="rounded-2xl border border-sky-500/20 bg-slate-900/40 p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
          <h3 className="text-base font-bold text-slate-100">
            {t('jobs.syncingTitle')}
          </h3>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            {t('jobs.syncingDesc')}
          </p>
        </div>
      ) : activeTab === 'for_you' && filteredJobs.length > 0 ? (
        (() => {
          const focusJob = filteredJobs[0];
          const reasons = [
            focusJob.requirements?.length
              ? `Matches key skills: ${focusJob.requirements.slice(0, 3).join(', ')}`
              : 'Matches your résumé background and core skills',
            `${focusJob.remoteType === 'remote' ? 'Remote-friendly' : focusJob.location || 'Location listed'} · ${focusJob.company}`,
            `Form supported (${focusJob.atsType}) — ready for browser review`,
          ];
          return (
            <div className="flex flex-col items-center gap-5 py-4">
              {/* Top progress bars */}
              <div className="flex gap-1.5 w-full max-w-[620px]">
                {filteredJobs.slice(0, 8).map((j, idx) => (
                  <div
                    key={j.id}
                    className={`flex-1 h-1 rounded-full ${idx === 0 ? 'bg-accent' : 'bg-surface-3'}`}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait" custom={swipeDir}>
                <motion.div
                  key={focusJob.id}
                  custom={swipeDir}
                  variants={focusSwipeVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="w-full max-w-[620px] rounded-[22px] bg-surface border border-border p-7 flex flex-col gap-5 shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm text-muted">
                        <span className="font-semibold text-text-2">{focusJob.company}</span>
                        <span>·</span>
                        <span>{focusJob.location || focusJob.remoteType}</span>
                      </div>
                      <h2 className="text-xl font-bold text-text mt-1">{focusJob.title}</h2>
                    </div>
                    {typeof focusJob.matchScore === 'number' && (
                      <ScoreRing score={focusJob.matchScore} size={60} />
                    )}
                  </div>

                  {/* 3 plain-language reasons */}
                  <div className="flex flex-col gap-2.5 text-sm text-text-2">
                    {reasons.map((r, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setSelectedJob(focusJob)}
                      className="text-sm font-medium text-accent-text hover:underline cursor-pointer"
                    >
                      See full job &amp; score details
                    </button>
                    <Badge tone="neutral">{focusJob.atsType}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={() => {
                        setSwipeDir(-1);
                        setUndoToast({ jobId: focusJob.id, title: focusJob.title, action: 'skip' });
                        void handleSkipJob(focusJob.id);
                      }}
                    >
                      <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                      <span>Skip</span>
                      <KeyboardHint keys="←" />
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={() => handleKeepFocusJob(focusJob)}
                    >
                      <span>Keep &amp; prepare</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                      <KeyboardHint keys="→" />
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>

              {undoToast && (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-md)] bg-surface-2 border border-border-strong shadow-lg text-sm">
                  <span className="text-text-2">
                    {undoToast.action === 'keep' ? 'Kept' : 'Skipped'}: {undoToast.title}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleUndo}>
                    <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Undo</span>
                  </Button>
                </div>
              )}
            </div>
          );
        })()
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => (
            <div key={job.id} className="flex flex-col gap-1.5">
              <JobCard
                job={job}
                onSelect={setSelectedJob}
                onApply={handleApply}
              />
              <div className="flex items-center justify-end gap-2 px-1">
                <Button
                  variant={shortlistedIds.has(job.id) ? 'success' : 'secondary'}
                  size="sm"
                  onClick={() => toggleShortlist(job.id)}
                >
                  <span>{shortlistedIds.has(job.id) ? 'Shortlisted' : 'Shortlist (S)'}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleSkipJob(job.id)}
                >
                  <span>Not for me (X)</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (syncError || isJobsError) && displayJobs.length === 0 ? (
        <div className="rounded-2xl border border-danger/30 bg-surface p-12 text-center flex flex-col items-center justify-center gap-3">
          <Briefcase className="w-10 h-10 text-danger" />
          <h3 className="text-base font-semibold text-text">{t('jobs.networkErrorTitle')}</h3>
          <p className="text-xs text-muted max-w-sm">
            {syncError || t('jobs.networkErrorDesc')}
          </p>
          <Button variant="primary" size="sm" onClick={() => void handleSync()} loading={isSyncing}>
            <span>{t('common.retry')}</span>
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-16 text-center flex flex-col items-center justify-center gap-3">
          <Briefcase className="w-12 h-12 text-slate-600 mb-1" />
          <h3 className="text-base font-semibold text-slate-200">
            {displayJobs.length === 0
              ? t('jobs.noMatchingJobs')
              : t('jobs.noJobsFound')}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm">
            {displayJobs.length === 0
              ? t('jobs.noJobsYetDesc')
              : t('jobs.noJobsFoundDesc')}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentView('preferences')}
          >
            <span>{t('jobs.editPreferences')}</span>
          </Button>
        </div>
      )}

      {/* Job Details Drawer */}
      <JobDetailDrawer
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onApply={handleApply}
      />

      {/* Monitored Company Boards Modal */}
      <CompanyBoardsModal
        isOpen={isBoardsModalOpen}
        onClose={() => setIsBoardsModalOpen(false)}
        boards={companyBoards}
        onToggleBoard={(id) => setCompanyBoards(b => b.map(x => x.id === id ? { ...x, active: !x.active } : x))}
        onAddBoard={(nb) => setCompanyBoards(b => [nb, ...b])}
        onDetectAts={async (url) => ({ atsType: 'generic' as AtsType, boardSlug: 'custom', boardUrl: url, companyName: 'Custom' })}
      />

      {/* Tailored Documents Studio Modal (Phase 4) */}
      <TailoredDocumentsModal
        isOpen={isTailoringModalOpen}
        onClose={() => setIsTailoringModalOpen(false)}
        job={tailoringJob}
        profile={profile as any}
        onProceedToApply={async () => {
          if (tailoringJob) {
            try {
              await createApplication.mutateAsync({
                jobId: tailoringJob.id,
                mode: 'review',
                resumePath: null,
                coverLetter: null,
              });
            } catch {
              queueJobApplication({
                job: {
                  id: tailoringJob.id,
                  title: tailoringJob.title,
                  company: tailoringJob.company,
                  applyUrl: tailoringJob.applyUrl,
                  atsType: tailoringJob.atsType,
                },
              });
            }
            setIsTailoringModalOpen(false);
            setCurrentView('queue');
          }
        }}
      />
    </div>
  );
};
