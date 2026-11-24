import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Search,
  RefreshCw,
  Loader2,
  FileText,
  UploadCloud,
} from 'lucide-react';
import { JobCard, type DisplayJob } from '../components/jobs/JobCard.js';
import { JobDetailDrawer } from '../components/jobs/JobDetailDrawer.js';
import { CompanyBoardsModal } from '../components/jobs/CompanyBoardsModal.js';
import { TailoredDocumentsModal } from '../components/documents/TailoredDocumentsModal.js';
import { useApplicationStore } from '../stores/applicationStore.js';
import { useAppStore } from '../stores/appStore.js';
import { useProfile, useJobs } from '../queries/index.js';
import { commands } from '../bindings.js';
import { formatNumber } from '../utils/formatters.js';
import type { CompanyBoard, AtsType } from '@kaarjoo/shared';

export const JobsView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { setCurrentView } = useAppStore();
  const { queueJobApplication } = useApplicationStore();

  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { data: dbJobs = [], refetch: refetchJobs } = useJobs();

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

  // Live crawl via Node engine sidecar & Rust core
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const keywords = profile?.skills?.map((s) => s.name).slice(0, 5) || null;
      await commands.jobsSearch({
        keywords,
        locations: null,
        remoteOnly: null,
        company: null,
        atsType: null,
        limit: 50,
      });
      await refetchJobs();
    } catch (err) {
      console.error('Failed to sync live jobs:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const displayJobs: DisplayJob[] = useMemo(() => {
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
  }, [dbJobs]);

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

      return true;
    });
  }, [displayJobs, searchQuery, regionFilter, remoteFilter, atsFilter, stackFilter]);

  const handleApply = (job: DisplayJob) => {
    setSelectedJob(null);
    setTailoringJob(job);
    setIsTailoringModalOpen(true);
  };

  // 1. If user has no profile, show clean empty state prompting résumé upload
  if (!isProfileLoading && !profile) {
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
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-xs font-semibold text-white transition-all shadow-md hover:shadow-sky-900/30 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? t('jobs.syncing') : t('jobs.syncFeed')}</span>
          </button>
        </div>
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
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onSelect={setSelectedJob}
              onApply={handleApply}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-16 text-center flex flex-col items-center justify-center">
          <Briefcase className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-base font-semibold text-slate-200">
            {displayJobs.length === 0
              ? t('jobs.noJobsYet')
              : t('jobs.noJobsFound')}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {displayJobs.length === 0
              ? t('jobs.noJobsYetDesc')
              : t('jobs.noJobsFoundDesc')}
          </p>
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
        onProceedToApply={() => {
          if (tailoringJob) {
            queueJobApplication({
              job: {
                id: tailoringJob.id,
                title: tailoringJob.title,
                company: tailoringJob.company,
                applyUrl: tailoringJob.applyUrl,
                atsType: tailoringJob.atsType,
              },
            });
            setIsTailoringModalOpen(false);
            setCurrentView('queue');
          }
        }}
      />
    </div>
  );
};
