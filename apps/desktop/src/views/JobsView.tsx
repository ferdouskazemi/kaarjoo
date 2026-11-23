import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Search,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { JobCard, type DisplayJob } from '../components/jobs/JobCard.js';
import { JobDetailDrawer } from '../components/jobs/JobDetailDrawer.js';
import { CompanyBoardsModal } from '../components/jobs/CompanyBoardsModal.js';
import { TailoredDocumentsModal } from '../components/documents/TailoredDocumentsModal.js';
import type { CompanyBoard, AtsType } from '@kaarjoo/shared';

// Initial high-quality US & European tech job postings seeded for discovery
const INITIAL_JOBS: DisplayJob[] = [
  {
    id: 'gh_stripe_501234',
    title: 'Staff Software Engineer - Global Payments',
    company: 'Stripe',
    location: 'San Francisco, CA (Remote - US)',
    remoteType: 'remote',
    atsType: 'greenhouse',
    applyUrl: 'https://boards.greenhouse.io/stripe/jobs/501234',
    postedAt: '2026-02-22T14:30:00Z',
    salaryText: '$225,000 - $290,000 / yr',
    matchScore: 96,
    matchedSkills: ['Distributed Systems', 'Go', 'Kubernetes', 'High-Throughput APIs', 'PostgreSQL'],
    missingSkills: ['Raft Consensus'],
    descriptionMarkdown: `## About Stripe
Stripe is building economic infrastructure for the internet. Millions of businesses—from the world's most innovative tech startups to global enterprises—use Stripe to accept payments, grow their revenue, and accelerate new business opportunities.

### The Role
As a Staff Software Engineer in Global Payments, you will design and architect high-reliability payment processing pipelines that execute millions of transactions daily across North America, Europe, and Asia.

### Qualifications
- 8+ years of engineering experience with distributed backend systems
- Strong command of Go, Java, or Rust
- Proven track record scaling database transactions and message queues
- Experience with zero-downtime database migrations
- Deep empathy for developer experience and financial compliance`,
  },
  {
    id: 'lever_figma_001',
    title: 'Principal Product Designer - Editor',
    company: 'Figma',
    location: 'San Francisco, CA (Remote)',
    remoteType: 'remote',
    atsType: 'lever',
    applyUrl: 'https://jobs.lever.co/figma/lever-figma-001',
    postedAt: '2026-02-21T18:00:00Z',
    salaryText: '$210,000 - $275,000 / yr',
    matchScore: 92,
    matchedSkills: ['Design Systems', 'Figma Tokens', 'UI/UX Architecture', 'Prototyping', 'Accessibility (a11y)'],
    missingSkills: ['WebGL Shaders'],
    descriptionMarkdown: `## About Figma
Figma makes software that helps teams build software together. We're on a mission to make design accessible to all teams.

### What you'll do:
- Lead the design architecture for the core multi-player canvas editor
- Define token semantics and design system component standards
- Partner closely with WebAssembly and C++ rendering engineers
- Mentor senior product designers across US and European hubs`,
  },
  {
    id: 'ashby_openai_101',
    title: 'Research Engineer - AI Alignment & Safety',
    company: 'OpenAI',
    location: 'San Francisco, CA (Hybrid)',
    remoteType: 'hybrid',
    atsType: 'ashby',
    applyUrl: 'https://jobs.ashbyhq.com/openai/ashby-openai-101',
    postedAt: '2026-02-20T10:00:00Z',
    salaryText: '$240,000 - $350,000 / yr',
    matchScore: 89,
    matchedSkills: ['Deep Learning', 'PyTorch', 'Reinforcement Learning (RLHF)', 'Python', 'Evaluation Benchmarks'],
    missingSkills: ['Triton Kernels'],
    descriptionMarkdown: `## Overview
We are looking for a Research Engineer to join our Frontier Alignment team. In this role, you will design automated auditing frameworks, model evaluations, and RLHF pipelines for multimodal foundation models.

### Responsibilities
- Scale model evaluation suites on GPU clusters
- Implement safety guardrails and prompt steerability checks
- Collaborate on empirical publications and open benchmark releases`,
  },
  {
    id: 'gh_spotify_77201',
    title: 'Senior Backend Engineer - Core Infrastructure',
    company: 'Spotify',
    location: 'Stockholm, Sweden (Remote Europe)',
    remoteType: 'remote',
    atsType: 'greenhouse',
    applyUrl: 'https://boards.greenhouse.io/spotify/jobs/77201',
    postedAt: '2026-02-19T11:00:00Z',
    salaryText: '€95,000 - €125,000 / yr',
    matchScore: 94,
    matchedSkills: ['Java', 'GCP', 'Kafka', 'Microservices', 'Distributed Tracing', 'Kubernetes'],
    missingSkills: ['Hermes Protocol'],
    descriptionMarkdown: `## Welcome to Spotify
We are looking for a Senior Backend Engineer to join our Core Infrastructure team in Stockholm or remote across Europe.

### What you'll do
- Build and operate the high-volume event backbone powering audio recommendations for 600M+ users
- Drive reliability and latency SLOs under 10ms for discovery APIs
- Champion open-source tooling and cloud-native practices`,
  },
  {
    id: 'workable_klarna_9988',
    title: 'Senior Cloud Infrastructure Architect',
    company: 'Klarna',
    location: 'Stockholm, Sweden / Berlin, Germany',
    remoteType: 'remote',
    atsType: 'workable',
    applyUrl: 'https://apply.workable.com/klarna/j/KLRN9988',
    postedAt: '2026-02-18T16:00:00Z',
    salaryText: '€100,000 - €130,000 / yr',
    matchScore: 87,
    matchedSkills: ['Terraform', 'AWS', 'Security Automation', 'CI/CD Pipelines', 'Linux Kernel'],
    missingSkills: ['OpenFGA'],
    descriptionMarkdown: `## About Klarna
Klarna is the AI-powered global payments network and shopping destination.

### Role description:
Scale our multi-region AWS cloud footprint across European banking zones with immutable infrastructure and automated disaster recovery.`,
  },
  {
    id: 'wwr_gitlab_staff',
    title: 'Staff Backend Engineer, Secure Analysis',
    company: 'GitLab',
    location: 'Worldwide Remote / All-Remote',
    remoteType: 'remote',
    atsType: 'greenhouse',
    applyUrl: 'https://boards.greenhouse.io/gitlab/jobs/wwr_staff',
    postedAt: '2026-02-17T09:00:00Z',
    salaryText: '$190,000 - $245,000 / yr',
    matchScore: 91,
    matchedSkills: ['Ruby on Rails', 'Go', 'Static Code Analysis (SAST)', 'PostgreSQL', 'Git'],
    missingSkills: ['Semgrep Rule Authoring'],
    descriptionMarkdown: `## GitLab is 100% All-Remote
You will lead technical direction for GitLab's Static Analysis scanning engines, protecting software supply chains worldwide.`,
  },
];

const SEEDED_BOARDS_DEFAULT: CompanyBoard[] = [
  { id: 'b1', name: 'Stripe', domain: 'stripe.com', atsType: 'greenhouse', boardSlug: 'stripe', boardUrl: 'https://boards.greenhouse.io/stripe', country: 'US', active: true, jobCount: 42 },
  { id: 'b2', name: 'Figma', domain: 'figma.com', atsType: 'lever', boardSlug: 'figma', boardUrl: 'https://jobs.lever.co/figma', country: 'US', active: true, jobCount: 18 },
  { id: 'b3', name: 'OpenAI', domain: 'openai.com', atsType: 'ashby', boardSlug: 'openai', boardUrl: 'https://jobs.ashbyhq.com/openai', country: 'US', active: true, jobCount: 35 },
  { id: 'b4', name: 'Spotify', domain: 'spotify.com', atsType: 'greenhouse', boardSlug: 'spotify', boardUrl: 'https://boards.greenhouse.io/spotify', country: 'SE', active: true, jobCount: 26 },
  { id: 'b5', name: 'Klarna', domain: 'klarna.com', atsType: 'workable', boardSlug: 'klarna', boardUrl: 'https://apply.workable.com/klarna', country: 'SE', active: true, jobCount: 15 },
  { id: 'b6', name: 'GitLab', domain: 'gitlab.com', atsType: 'greenhouse', boardSlug: 'gitlab', boardUrl: 'https://boards.greenhouse.io/gitlab', country: 'US', active: true, jobCount: 50 },
  { id: 'b7', name: 'DeepL', domain: 'deepl.com', atsType: 'greenhouse', boardSlug: 'deepl', boardUrl: 'https://boards.greenhouse.io/deepl', country: 'DE', active: true, jobCount: 12 },
  { id: 'b8', name: 'Revolut', domain: 'revolut.com', atsType: 'lever', boardSlug: 'revolut', boardUrl: 'https://jobs.lever.co/revolut', country: 'GB', active: true, jobCount: 30 },
];

export const JobsView: React.FC = () => {
  const { t } = useTranslation();

  // State
  const [jobs, setJobs] = useState<DisplayJob[]>(INITIAL_JOBS);
  const [companyBoards, setCompanyBoards] = useState<CompanyBoard[]>(SEEDED_BOARDS_DEFAULT);
  const [selectedJob, setSelectedJob] = useState<DisplayJob | null>(null);
  const [tailoringJob, setTailoringJob] = useState<DisplayJob | null>(null);
  const [isBoardsModalOpen, setIsBoardsModalOpen] = useState(false);
  const [isTailoringModalOpen, setIsTailoringModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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

  // Sync simulation / polite crawler run
  const handleSync = async () => {
    setIsSyncing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsSyncing(false);
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

      // ATS filter
      if (atsFilter !== 'all' && job.atsType !== atsFilter) {
        return false;
      }

      return true;
    });
  }, [jobs, searchQuery, regionFilter, remoteFilter, atsFilter]);

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Top Banner / Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-100">{t('jobs.title')}</h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {t('jobs.sourcesHealthy')}
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

      {/* Job Cards Feed */}
      {filteredJobs.length > 0 ? (
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
            فیلترهای انتخابی را تغییر دهید یا شرکت‌های جدیدی را در بخش «شرکت‌های تحت رصد» فعال کنید.
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
          setIsTailoringModalOpen(false);
          alert('مدارک اختصاصی با موفقیت تایید و ذخیره شدند! آماده ارسال در فاز ۵ (فرم‌های ATS).');
        }}
      />
    </div>
  );
};
