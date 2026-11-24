import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Search,
  RefreshCw,
  Building2,
  Loader2,
} from 'lucide-react';
import { JobCard, type DisplayJob } from '../components/jobs/JobCard.js';
import { JobDetailDrawer } from '../components/jobs/JobDetailDrawer.js';
import { CompanyBoardsModal } from '../components/jobs/CompanyBoardsModal.js';
import { TailoredDocumentsModal } from '../components/documents/TailoredDocumentsModal.js';
import { useApplicationStore } from '../stores/applicationStore.js';
import { useAppStore } from '../stores/appStore.js';
import type { CompanyBoard, AtsType } from '@kaarjoo/shared';
import { fetchAllLiveJobs } from '../services/liveJobService.js';

const LIVE_COMPANY_BOARDS_DEFAULT: CompanyBoard[] = [
  { id: 'b1', name: 'Linear', domain: 'linear.app', atsType: 'ashby', boardSlug: 'linear', boardUrl: 'https://jobs.ashbyhq.com/linear', country: 'US', active: true, jobCount: 30 },
  { id: 'b2', name: 'Ramp', domain: 'ramp.com', atsType: 'ashby', boardSlug: 'ramp', boardUrl: 'https://jobs.ashbyhq.com/ramp', country: 'US', active: true, jobCount: 180 },
  { id: 'b3', name: 'OpenAI', domain: 'openai.com', atsType: 'ashby', boardSlug: 'openai', boardUrl: 'https://jobs.ashbyhq.com/openai', country: 'US', active: true, jobCount: 860 },
  { id: 'b4', name: 'GitLab', domain: 'gitlab.com', atsType: 'greenhouse', boardSlug: 'gitlab', boardUrl: 'https://boards.greenhouse.io/gitlab', country: 'US', active: true, jobCount: 250 },
  { id: 'b5', name: 'Cloudflare', domain: 'cloudflare.com', atsType: 'greenhouse', boardSlug: 'cloudflare', boardUrl: 'https://boards.greenhouse.io/cloudflare', country: 'US', active: true, jobCount: 500 },
  { id: 'b6', name: 'Canonical', domain: 'canonical.com', atsType: 'greenhouse', boardSlug: 'canonical', boardUrl: 'https://boards.greenhouse.io/canonical', country: 'GB', active: true, jobCount: 310 },
];

export const JobsView: React.FC = () => {
  const { t } = useTranslation();
  const { setCurrentView } = useAppStore();
  const { queueJobApplication } = useApplicationStore();

  // State: 100% Real Live Crawled Jobs - ZERO SEED DATA
  const [jobs, setJobs] = useState<DisplayJob[]>([]);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [companyBoards, setCompanyBoards] = useState<CompanyBoard[]>(LIVE_COMPANY_BOARDS_DEFAULT);
  const [selectedJob, setSelectedJob] = useState<DisplayJob | null>(null);
  const [tailoringJob, setTailoringJob] = useState<DisplayJob | null>(null);
  const [isBoardsModalOpen, setIsBoardsModalOpen] = useState(false);
  const [isTailoringModalOpen, setIsTailoringModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadLiveJobs = async () => {
    setIsSyncing(true);
    setIsLoadingLive(true);
    try {
      const liveJobs = await fetchAllLiveJobs();
      setJobs(liveJobs);
    } catch (err) {
      console.error('Failed to fetch live jobs:', err);
    } finally {
      setIsSyncing(false);
      setIsLoadingLive(false);
    }
  };

  useEffect(() => {
    loadLiveJobs();
  }, []);

  const handleFeedback = (jobId: string, feedback: 'relevant' | 'irrelevant') => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, userFeedback: feedback } : j))
    );
    if (selectedJob && selectedJob.id === jobId) {
      setSelectedJob((prev) => (prev ? { ...prev, userFeedback: feedback } : null));
    }
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<'all' | 'us' | 'eu' | 'remote'>('all');
  const [remoteFilter, setRemoteFilter] = useState<'all' | 'remote' | 'hybrid' | 'on-site'>('all');
  const [atsFilter, setAtsFilter] = useState<'all' | AtsType>('all');
  const [stackFilter, setStackFilter] = useState<string>('all');

  // Real live crawler run
  const handleSync = async () => {
    await loadLiveJobs();
  };

  const handleToggleBoard = (id: string) => {
    setCompanyBoards((prev) =>
      prev.map((b) => (b.id === id ? { ...b, active: !b.active } : b))
    );
  };

  const handleAddBoard = (newBoard: CompanyBoard) => {
    setCompanyBoards((prev) => [newBoard, ...prev]);
  };

  const handleDetectAts = async (url: string) => {
    const l = url.toLowerCase();
    if (l.includes('greenhouse.io')) {
      const slug = url.split('/').filter(Boolean).pop() || 'company';
      return { atsType: 'greenhouse', boardSlug: slug, boardUrl: `https://boards.greenhouse.io/${slug}`, companyName: slug.toUpperCase() };
    }
    if (l.includes('lever.co')) {
      const slug = url.split('/').filter(Boolean).pop() || 'company';
      return { atsType: 'lever', boardSlug: slug, boardUrl: `https://jobs.lever.co/${slug}`, companyName: slug.toUpperCase() };
    }
    if (l.includes('ashbyhq.com')) {
      const slug = url.split('/').filter(Boolean).pop() || 'company';
      return { atsType: 'ashby', boardSlug: slug, boardUrl: `https://jobs.ashbyhq.com/${slug}`, companyName: slug.toUpperCase() };
    }
    if (l.includes('workable.com')) {
      const slug = url.split('/').filter(Boolean).pop() || 'company';
      return { atsType: 'workable', boardSlug: slug, boardUrl: `https://apply.workable.com/${slug}`, companyName: slug.toUpperCase() };
    }
    return {
      atsType: 'greenhouse',
      boardSlug: 'custom',
      boardUrl: url,
      companyName: 'Custom Company',
    };
  };

  const handleApply = (job: DisplayJob) => {
    setSelectedJob(null);
    setTailoringJob(job);
    setIsTailoringModalOpen(true);
  };

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = job.title.toLowerCase().includes(q);
        const matchesCompany = job.company.toLowerCase().includes(q);
        const matchesLocation = (job.location || '').toLowerCase().includes(q);
        const matchesSkills = job.matchedSkills?.some((s) => s.toLowerCase().includes(q));
        if (!matchesTitle && !matchesCompany && !matchesLocation && !matchesSkills) {
          return false;
        }
      }

      // Region filter
      if (regionFilter === 'us') {
        const isUs = (job.location || '').includes('US') || (job.location || '').includes('San Francisco') || (job.location || '').includes('CA');
        if (!isUs) return false;
      } else if (regionFilter === 'eu') {
        const isEu = (job.location || '').includes('Europe') || (job.location || '').includes('Sweden') || (job.location || '').includes('Stockholm') || (job.location || '').includes('Germany');
        if (!isEu) return false;
      } else if (regionFilter === 'remote') {
        if (job.remoteType !== 'remote') return false;
      }

      // Remote filter
      if (remoteFilter !== 'all' && job.remoteType !== remoteFilter) {
        return false;
      }

      // Stack filter
      if (stackFilter !== 'all') {
        const textToSearch = `${job.title} ${(job.matchedSkills || []).join(' ')}`.toLowerCase();
        if (stackFilter === 'frontend' && !textToSearch.includes('frontend') && !textToSearch.includes('front-end') && !textToSearch.includes('react') && !textToSearch.includes('web')) return false;
        if (stackFilter === 'fullstack' && !textToSearch.includes('fullstack') && !textToSearch.includes('full-stack') && !textToSearch.includes('software')) return false;
        if (stackFilter === 'typescript' && !textToSearch.includes('typescript') && !textToSearch.includes('javascript') && !textToSearch.includes('react')) return false;
        if (stackFilter === 'design' && !textToSearch.includes('design') && !textToSearch.includes('product') && !textToSearch.includes('ui/ux') && !textToSearch.includes('figma')) return false;
      }

      // ATS filter
      if (atsFilter !== 'all' && job.atsType !== atsFilter) {
        return false;
      }

      return true;
    });
  }, [jobs, searchQuery, regionFilter, remoteFilter, atsFilter, stackFilter]);

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Top Banner / Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-100">{t('jobs.title')}</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>خزش زنده مستقیم از بوردها (بدون داده Seed)</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            {t('jobs.subtitle')}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsBoardsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 transition-colors shadow-sm"
          >
            <Building2 className="w-3.5 h-3.5 text-sky-400" />
            <span>{t('jobs.companyBoards')}</span>
            <span className="ms-1 px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
              {companyBoards.filter((b) => b.active).length}
            </span>
          </button>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-xs font-semibold text-white transition-all shadow-md hover:shadow-sky-900/30"
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
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در عنوان شغل، نام شرکت یا مهارت (مثلاً Distributed Systems, Go, React)..."
              className="w-full ps-9 pe-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Region Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            {(['all', 'us', 'eu', 'remote'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRegionFilter(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  regionFilter === r
                    ? 'bg-slate-800 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {r === 'all'
                  ? t('jobs.allRegions')
                  : r === 'us'
                    ? '🇺🇸 آمریکا'
                    : r === 'eu'
                      ? '🇪🇺 اروپا'
                      : '🌍 فقط ریموت'}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Tech Stack Filter Ribbon (Sub-millisecond instant matching) */}
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/40">
          <span className="text-[11px] text-slate-400 font-medium me-1">تخصص شما:</span>
          {[
            { id: 'all', label: 'همه موقعیت‌ها' },
            { id: 'frontend', label: '⚛️ فرانت‌اند (React / Web)' },
            { id: 'typescript', label: '📘 TypeScript / JavaScript' },
            { id: 'fullstack', label: '🌐 فول‌استک (Fullstack)' },
            { id: 'design', label: '🎨 محصول و UI/UX' },
          ].map((stack) => (
            <button
              key={stack.id}
              onClick={() => setStackFilter(stack.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
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
              <span className="text-slate-500 me-1">محیط کار:</span>
              {(['all', 'remote', 'hybrid', 'on-site'] as const).map((rt) => (
                <button
                  key={rt}
                  onClick={() => setRemoteFilter(rt)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors border ${
                    remoteFilter === rt
                      ? 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {rt === 'all' ? 'همه' : rt === 'remote' ? 'دورکاری' : rt === 'hybrid' ? 'هیبرید' : 'حضوری'}
                </button>
              ))}
            </div>

            {/* ATS Provider Filter */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-500 me-1">سیستم ATS:</span>
              {(['all', 'greenhouse', 'lever', 'ashby', 'workable'] as const).map((ats) => (
                <button
                  key={ats}
                  onClick={() => setAtsFilter(ats)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono uppercase transition-colors border ${
                    atsFilter === ats
                      ? 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {ats}
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            نمایش {filteredJobs.length} موقعیت شغلی
          </span>
        </div>
      </div>

      {/* Job Cards Feed or Live Loading State */}
      {isLoadingLive && jobs.length === 0 ? (
        <div className="rounded-2xl border border-sky-500/20 bg-slate-900/40 p-16 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
          <h3 className="text-base font-bold text-slate-100">در حال خزش و دریافت مشاغل ۱۰۰٪ واقعی و زنده...</h3>
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            سیستم کارجو در حال اتصال زنده به APIهای عمومی و رسمی <strong>Linear</strong>، <strong>Ramp</strong>، <strong>OpenAI</strong> (Ashby) و <strong>GitLab</strong>، <strong>Cloudflare</strong> (Greenhouse) است. تمام داده‌ها تازه و کاملاً بدون Seed هستند.
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
              onFeedback={handleFeedback}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-16 text-center flex flex-col items-center justify-center">
          <Briefcase className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-base font-semibold text-slate-200">{t('jobs.noJobsFound')}</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            فیلترهای انتخابی را تغییر دهید یا دکمه «خزش و بروزرسانی زنده» را کلیک نمایید.
          </p>
        </div>
      )}

      {/* Job Details Drawer */}
      <JobDetailDrawer
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onApply={handleApply}
        onFeedback={handleFeedback}
      />

      {/* Monitored Company Boards Modal */}
      <CompanyBoardsModal
        isOpen={isBoardsModalOpen}
        onClose={() => setIsBoardsModalOpen(false)}
        boards={companyBoards}
        onToggleBoard={handleToggleBoard}
        onAddBoard={handleAddBoard}
        onDetectAts={handleDetectAts}
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
