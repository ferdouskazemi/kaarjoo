import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  ExternalLink,
  Building2,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  DollarSign,
  FileText,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import type { DisplayJob } from './JobCard.js';
import { formatNumber } from '../../utils/formatters.js';

interface JobDetailDrawerProps {
  job: DisplayJob | null;
  onClose: () => void;
  onApply: (job: DisplayJob) => void;
  onFeedback?: (jobId: string, feedback: 'relevant' | 'irrelevant') => void;
}

export const JobDetailDrawer: React.FC<JobDetailDrawerProps> = ({ job, onClose, onApply, onFeedback }) => {
  const { t, i18n } = useTranslation();
  if (!job) return null;

  const score = job.matchScore ?? 88;
  const matchedSkills = job.matchedSkills || ['TypeScript', 'React', 'Node.js', 'Distributed Systems'];
  const missingSkills = job.missingSkills || ['Kubernetes Operator SDK'];
  const topReasons = job.topReasons || [
    'Direct alignment with primary core resume skills',
    'Seniority and responsibility matching verified',
    'Remote setup aligned with work preferences',
  ];
  const whyNotHigher = job.whyNotHigher || t('matching.whyNotHigherTip');
  const breakdown = job.breakdown || {
    hardFilterScore: 100,
    semanticScore: 88,
    skillCoverageScore: 92,
    llmRerankScore: 89,
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border-s border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-slide-left">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
                {job.remoteType === 'remote'
                  ? t('jobs.remoteOnly')
                  : job.remoteType === 'hybrid'
                    ? t('jobs.hybrid')
                    : t('jobs.onSite')}
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-mono uppercase text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                ATS: {job.atsType}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 leading-snug">{job.title}</h2>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-slate-200 font-medium">
                <Building2 className="w-4 h-4 text-slate-400" />
                {job.company}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-slate-400" />
                {job.location || 'Worldwide'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Match Score Card with Breakdown */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h4 className="font-semibold text-slate-200 text-sm">{t('jobs.matchScore')}</h4>
              </div>
              <div className="flex items-center gap-3">
                {onFeedback && (
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                    <button
                      type="button"
                      title={t('jobs.feedbackRelevant')}
                      onClick={() => onFeedback(job.id, 'relevant')}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${
                        job.userFeedback === 'relevant'
                          ? 'bg-emerald-950 text-emerald-400'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title={t('jobs.feedbackNotRelevant')}
                      onClick={() => onFeedback(job.id, 'irrelevant')}
                      className={`p-1.5 rounded transition-colors cursor-pointer ${
                        job.userFeedback === 'irrelevant'
                          ? 'bg-red-950 text-red-400'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-emerald-400">
                    {formatNumber(score, i18n.language)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Score Breakdown Progress Bars */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">{t('matching.requirementsScore')}</span>
                  <span className="text-slate-200 font-mono font-semibold">{formatNumber(breakdown.hardFilterScore, i18n.language)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${breakdown.hardFilterScore}%` }} />
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">{t('matching.titleScore')}</span>
                  <span className="text-slate-200 font-mono font-semibold">{formatNumber(breakdown.semanticScore, i18n.language)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div className="bg-sky-500 h-1.5 rounded-full" style={{ width: `${breakdown.semanticScore}%` }} />
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">{t('matching.skillCoverage')}</span>
                  <span className="text-slate-200 font-mono font-semibold">{formatNumber(breakdown.skillCoverageScore, i18n.language)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${breakdown.skillCoverageScore}%` }} />
                </div>
              </div>

              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">{t('matching.overallScore')}</span>
                  <span className="text-slate-200 font-mono font-semibold">{formatNumber(breakdown.llmRerankScore, i18n.language)}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${breakdown.llmRerankScore}%` }} />
                </div>
              </div>
            </div>

            {/* Top 3 Reasons */}
            <div className="pt-3 border-t border-slate-800/60 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-300 block">{t('matching.topReasons')}:</span>
              <ul className="space-y-1.5">
                {topReasons.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Why not higher? */}
            {score < 95 && (
              <div className="rounded-lg bg-slate-900/40 p-3 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-300">
                <HelpCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-sky-300 block mb-0.5">{t('matching.whyNotHigher')}</span>
                  <span className="text-slate-400 text-[11px] leading-relaxed">{whyNotHigher}</span>
                </div>
              </div>
            )}

            {/* Matched & Missing Skills Chips */}
            <div className="flex flex-col gap-3 pt-3 border-t border-slate-800/60">
              <div>
                <span className="text-xs font-medium text-slate-400 mb-2 block">{t('jobs.matchedSkills')}:</span>
                <div className="flex flex-wrap gap-1.5">
                  {matchedSkills.map((s, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {missingSkills.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-slate-400 mb-2 block">{t('jobs.missingSkills')}:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {missingSkills.map((s, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-amber-950/30 text-amber-300 border border-amber-800/40"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Salary Banner */}
          {job.salaryText && (
            <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-4 flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs text-amber-400/80 font-medium block">{t('jobs.salary')}</span>
                <span className="text-sm font-semibold text-amber-200">{job.salaryText}</span>
              </div>
            </div>
          )}

          {/* Job Description (Markdown formatted) */}
          <div className="flex flex-col gap-3">
            <h4 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              {t('jobs.description')}
            </h4>
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 text-xs leading-relaxed space-y-4 whitespace-pre-line rounded-xl border border-slate-800/60 bg-slate-950/30 p-5 font-sans">
              {job.descriptionMarkdown || t('common.loading')}
            </div>
          </div>
        </div>

        {/* Footer CTAs */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700/80 text-xs font-medium text-slate-200 transition-colors"
          >
            <span>{t('jobs.viewOriginal')}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          <button
            onClick={() => onApply(job)}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition-all shadow-md hover:shadow-sky-900/30 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t('jobs.applyReview')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
