import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  MapPin,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import type { JobPosting, RemoteType, AtsType } from '@kaarjoo/shared';

export interface DisplayJob extends Partial<JobPosting> {
  id: string;
  title: string;
  company: string;
  location?: string;
  remoteType: RemoteType;
  atsType: AtsType;
  applyUrl: string;
  postedAt?: string;
  salaryText?: string;
  matchScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
}

interface JobCardProps {
  job: DisplayJob;
  onSelect: (job: DisplayJob) => void;
  onApply: (job: DisplayJob) => void;
}

const ATS_COLORS: Record<AtsType, { bg: string; text: string; border: string }> = {
  greenhouse: { bg: 'bg-emerald-950/40', text: 'text-emerald-400', border: 'border-emerald-800/50' },
  lever: { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-800/50' },
  ashby: { bg: 'bg-purple-950/40', text: 'text-purple-400', border: 'border-purple-800/50' },
  workable: { bg: 'bg-teal-950/40', text: 'text-teal-400', border: 'border-teal-800/50' },
  generic: { bg: 'bg-slate-900', text: 'text-slate-400', border: 'border-slate-800' },
};

function getInitialsColor(name: string): string {
  const colors = [
    'from-indigo-600 to-blue-500',
    'from-emerald-600 to-teal-500',
    'from-purple-600 to-pink-500',
    'from-amber-600 to-orange-500',
    'from-cyan-600 to-blue-600',
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return colors[sum % colors.length];
}

export const JobCard: React.FC<JobCardProps> = ({ job, onSelect, onApply }) => {
  const { t } = useTranslation();
  const atsStyle = ATS_COLORS[job.atsType] || ATS_COLORS.generic;
  const score = job.matchScore ?? 85;

  return (
    <div
      onClick={() => onSelect(job)}
      className="group relative rounded-xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700/80 p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 shadow-sm hover:shadow-md"
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 min-w-0">
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getInitialsColor(
              job.company
            )} flex items-center justify-center font-bold text-white text-base shrink-0 shadow-inner`}
          >
            {job.company.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-100 text-base leading-snug group-hover:text-sky-400 transition-colors line-clamp-1">
              {job.title}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
              <span className="font-medium text-slate-300 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {job.company}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 line-clamp-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {job.location || 'US / EU'}
              </span>
            </div>
          </div>
        </div>

        {/* Match Ring */}
        <div className="flex flex-col items-center shrink-0">
          <div className="relative w-11 h-11 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={score >= 85 ? 'text-emerald-500' : score >= 70 ? 'text-sky-500' : 'text-amber-500'}
                strokeDasharray={`${score}, 100`}
                strokeWidth="3"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-slate-200">{score}%</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-0.5 font-medium">تطابق</span>
        </div>
      </div>

      {/* Tags & Salary */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-800/50">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Remote Badge */}
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
              job.remoteType === 'remote'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                : job.remoteType === 'hybrid'
                  ? 'bg-sky-950/40 text-sky-300 border-sky-800/40'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            {job.remoteType === 'remote' ? 'دورکاری (Remote)' : job.remoteType === 'hybrid' ? 'ترکیبی (Hybrid)' : 'حضوری'}
          </span>

          {/* ATS Provider Chip */}
          <span className={`text-xs px-2 py-0.5 rounded font-mono uppercase text-[10px] border ${atsStyle.bg} ${atsStyle.text} ${atsStyle.border}`}>
            {job.atsType}
          </span>

          {job.salaryText && (
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-medium">
              {job.salaryText}
            </span>
          )}
        </div>

        {/* Matched skills preview */}
        {job.matchedSkills && job.matchedSkills.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400 font-medium">+{job.matchedSkills.length} مهارت منطبق</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <span className="text-[11px] text-slate-500 font-medium">
          {job.postedAt ? new Date(job.postedAt).toLocaleDateString() : 'به‌تازگی منتشرشده'}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(job);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-200 transition-colors"
          >
            {t('jobs.viewDetails')}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onApply(job);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-medium text-white transition-colors shadow-sm"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('jobs.applyReview')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
