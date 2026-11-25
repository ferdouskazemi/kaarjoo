import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Search,
  ExternalLink,
  Sparkles,
  MapPin,
  Eye,
  Trash2,
} from 'lucide-react';
import { ApplicationRecord, ApplicationStatus } from '@kaarjoo/shared';
import { formatDate, formatNumber } from '../../utils/formatters.js';

interface ApplicationsTableViewProps {
  applications: ApplicationRecord[];
  onSelectApplication: (app: ApplicationRecord) => void;
  onMoveStatus: (id: string, status: ApplicationStatus) => void;
  onDeleteApplication: (id: string) => void;
}

export const ApplicationsTableView: React.FC<ApplicationsTableViewProps> = ({
  applications,
  onSelectApplication,
  onMoveStatus,
  onDeleteApplication,
}) => {
  const { t, i18n } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredApps = applications.filter((app) => {
    const matchesSearch =
      app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.location && app.location.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: ApplicationStatus) => {
    const classMap: Record<string, string> = {
      saved: 'bg-slate-800 text-slate-300',
      queued: 'bg-sky-500/10 text-sky-400 border border-sky-500/30',
      needs_review: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
      applied: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30',
      submitted: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30',
      interview: 'bg-amber-500/20 text-amber-200 border border-amber-500/40',
      offer: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
      rejected: 'bg-rose-500/10 text-rose-300 border border-rose-500/30',
    };
    const c = classMap[status] || 'bg-slate-800 text-slate-400';

    return (
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium font-sans ${c}`}>
        {t(`status.${status}`, status)}
      </span>
    );
  };

  const getAtsBadge = (ats: string) => {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider bg-slate-900 text-slate-400 border-slate-800">
        {ats}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute end-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('tracker.searchPlaceholder')}
            className="w-full pe-9 ps-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/60"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-sky-500/60"
          >
            <option value="all">{t('tracker.allStatuses')}</option>
            <option value="saved">{t('tracker.statusSaved')}</option>
            <option value="needs_review">{t('tracker.statusNeedsReview')}</option>
            <option value="applied">{t('tracker.statusApplied')}</option>
            <option value="interview">{t('tracker.statusInterview')}</option>
            <option value="offer">{t('tracker.statusOffer')}</option>
            <option value="rejected">{t('tracker.statusRejected')}</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800/80 text-[11px] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{t('tracker.companyRole')}</th>
                <th className="py-3 px-4 text-start">{t('tracker.ats')}</th>
                <th className="py-3 px-4 text-start">{t('tracker.score')}</th>
                <th className="py-3 px-4 text-start">{t('jobs.salary')}</th>
                <th className="py-3 px-4 text-start">{t('tracker.status')}</th>
                <th className="py-3 px-4 text-start">{t('tracker.appliedDate')}</th>
                <th className="py-3 px-4 text-end">{t('tracker.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredApps.length > 0 ? (
                filteredApps.map((app) => (
                  <tr
                    key={app.id}
                    onClick={() => onSelectApplication(app)}
                    className="hover:bg-slate-850/60 transition-colors cursor-pointer group"
                  >
                    {/* Company & Role */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-100 group-hover:text-sky-300 transition-colors">
                          {app.jobTitle}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1 font-medium text-slate-300">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            {app.company}
                          </span>
                          {app.location && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="flex items-center gap-0.5 truncate max-w-[150px]">
                                <MapPin className="w-2.5 h-2.5 text-slate-500" />
                                {app.location}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ATS Type */}
                    <td className="py-3.5 px-4">{getAtsBadge(app.atsType)}</td>

                    {/* Match Score */}
                    <td className="py-3.5 px-4">
                      {app.matchScore ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs">
                          <Sparkles className="w-3 h-3" />
                          {formatNumber(app.matchScore, i18n.language)}%
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">--</span>
                      )}
                    </td>

                    {/* Salary */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                      {app.salaryText ? app.salaryText.split('/')[0] : <span className="text-slate-600">{t('tracker.negotiable')}</span>}
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-flex items-center">
                        <div className="pointer-events-none">
                          {getStatusBadge(app.status)}
                        </div>
                        <select
                          value={app.status}
                          aria-label={t('tracker.status')}
                          onChange={(e) => onMoveStatus(app.id, e.target.value as ApplicationStatus)}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        >
                          <option value="saved" className="bg-slate-900 text-slate-200">{t('tracker.statusSaved')}</option>
                          <option value="needs_review" className="bg-slate-900 text-slate-200">{t('tracker.statusNeedsReview')}</option>
                          <option value="applied" className="bg-slate-900 text-slate-200">{t('tracker.statusApplied')}</option>
                          <option value="interview" className="bg-slate-900 text-slate-200">{t('tracker.statusInterview')}</option>
                          <option value="offer" className="bg-slate-900 text-slate-200">{t('tracker.statusOffer')}</option>
                          <option value="rejected" className="bg-slate-900 text-slate-200">{t('tracker.statusRejected')}</option>
                        </select>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {formatDate(app.updatedAt, i18n.language)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-end" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onSelectApplication(app)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors cursor-pointer"
                          title={t('common.review')}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={app.applyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title={t('jobs.viewOriginal')}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => onDeleteApplication(app.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    {t('tracker.noMatch')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
