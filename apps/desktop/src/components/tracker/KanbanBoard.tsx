import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { ApplicationRecord, ApplicationStatus, KanbanColumnId } from '@kaarjoo/shared';

interface KanbanBoardProps {
  applications: ApplicationRecord[];
  onSelectApplication: (app: ApplicationRecord) => void;
  onMoveStatus: (id: string, status: ApplicationStatus) => void;
}

interface ColumnDef {
  id: KanbanColumnId;
  titleFa: string;
  titleEn: string;
  colorClass: string;
  borderClass: string;
  countBadgeClass: string;
}

const KANBAN_COLUMNS: ColumnDef[] = [
  {
    id: 'saved',
    titleFa: 'ذخیره‌شده',
    titleEn: 'Saved',
    colorClass: 'text-slate-300',
    borderClass: 'border-slate-800',
    countBadgeClass: 'bg-slate-800 text-slate-300',
  },
  {
    id: 'ready',
    titleFa: 'آماده ارسال / صف',
    titleEn: 'Ready / Queued',
    colorClass: 'text-sky-300',
    borderClass: 'border-sky-900/60',
    countBadgeClass: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  },
  {
    id: 'applied',
    titleFa: 'ارسال‌شده',
    titleEn: 'Applied',
    colorClass: 'text-indigo-300',
    borderClass: 'border-indigo-900/60',
    countBadgeClass: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
  },
  {
    id: 'interview',
    titleFa: 'مصاحبه',
    titleEn: 'Interview',
    colorClass: 'text-amber-300',
    borderClass: 'border-amber-900/60',
    countBadgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  },
  {
    id: 'offer',
    titleFa: 'پیشنهاد کاری',
    titleEn: 'Offer',
    colorClass: 'text-emerald-300',
    borderClass: 'border-emerald-900/60',
    countBadgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  },
  {
    id: 'rejected',
    titleFa: 'رد شده / بایگانی',
    titleEn: 'Rejected',
    colorClass: 'text-rose-300',
    borderClass: 'border-rose-900/60',
    countBadgeClass: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
  },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  applications,
  onSelectApplication,
  onMoveStatus,
}) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const mapStatusToColumn = (status: ApplicationStatus): KanbanColumnId => {
    switch (status) {
      case 'saved':
        return 'saved';
      case 'draft':
      case 'queued':
      case 'needs_review':
      case 'filling':
      case 'needs_user':
        return 'ready';
      case 'submitting':
      case 'submitted':
      case 'applied':
        return 'applied';
      case 'interview':
        return 'interview';
      case 'offer':
        return 'offer';
      case 'rejected':
      case 'withdrawn':
      case 'failed':
      case 'cancelled':
        return 'rejected';
      default:
        return 'saved';
    }
  };

  const getAtsBadge = (ats: string) => {
    const colors: Record<string, string> = {
      greenhouse: 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60',
      lever: 'bg-blue-950/70 text-blue-300 border-blue-800/60',
      ashby: 'bg-purple-950/70 text-purple-300 border-purple-800/60',
      workable: 'bg-teal-950/70 text-teal-300 border-teal-800/60',
      generic: 'bg-slate-900 text-slate-400 border-slate-800',
    };
    return (
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider ${colors[ats] || colors.generic}`}>
        {ats}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3.5 items-start w-full">
      {KANBAN_COLUMNS.map((column, colIdx) => {
        const columnApps = applications.filter((a) => mapStatusToColumn(a.status) === column.id);

        return (
          <div
            key={column.id}
            className={`rounded-2xl border ${column.borderClass} bg-slate-900/40 p-3 flex flex-col gap-2.5 min-h-[520px]`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/70 px-1">
              <span className={`text-xs font-bold ${column.colorClass}`}>
                {isRtl ? column.titleFa : column.titleEn}
              </span>
              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold ${column.countBadgeClass}`}>
                {columnApps.length}
              </span>
            </div>

            {/* Applications Cards */}
            <div className="flex flex-col gap-2.5 flex-1">
              {columnApps.length > 0 ? (
                columnApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => onSelectApplication(app)}
                    className="group relative rounded-xl border border-slate-800/90 bg-slate-900/90 hover:bg-slate-850 hover:border-slate-700/80 p-3.5 flex flex-col gap-2.5 shadow-sm hover:shadow-md transition-all cursor-pointer text-start"
                  >
                    {/* Top Row: Company & ATS & Score */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          {app.company}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {getAtsBadge(app.atsType)}
                        {app.matchScore && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">
                            <Sparkles className="w-2.5 h-2.5" />
                            {app.matchScore}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Job Title */}
                    <h4 className="text-xs font-medium text-slate-100 line-clamp-2 leading-snug group-hover:text-sky-300 transition-colors">
                      {app.jobTitle}
                    </h4>

                    {/* Location or Salary */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      {app.location && (
                        <span className="flex items-center gap-1 truncate max-w-[140px]">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{app.location}</span>
                        </span>
                      )}
                      {app.salaryText && (
                        <span className="flex items-center gap-0.5 text-emerald-400/90 font-mono text-[10px]">
                          <DollarSign className="w-3 h-3 shrink-0" />
                          <span>{app.salaryText.split('/')[0]}</span>
                        </span>
                      )}
                    </div>

                    {/* Interview Date Pill (if interview column) */}
                    {app.interviewDate && (
                      <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 shrink-0 text-amber-400" />
                        <span className="truncate">
                          مصاحبه: {new Date(app.interviewDate).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US')}
                        </span>
                      </div>
                    )}

                    {/* Footer / Quick Transition Mover Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 mt-0.5 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span>
                          {new Date(app.updatedAt).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US', {
                            month: 'numeric',
                            day: 'numeric',
                          })}
                        </span>
                      </span>

                      {/* Quick Next/Prev Status Buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {colIdx > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const prevCol = KANBAN_COLUMNS[colIdx - 1];
                              onMoveStatus(app.id, prevCol.id as ApplicationStatus);
                            }}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                            title={isRtl ? 'انتقال به ستون قبلی' : 'Move Left'}
                          >
                            {isRtl ? <ArrowRight className="w-3 h-3" /> : <ArrowLeft className="w-3 h-3" />}
                          </button>
                        )}
                        {colIdx < KANBAN_COLUMNS.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextCol = KANBAN_COLUMNS[colIdx + 1];
                              onMoveStatus(app.id, nextCol.id as ApplicationStatus);
                            }}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                            title={isRtl ? 'انتقال به ستون بعدی' : 'Move Right'}
                          >
                            {isRtl ? <ArrowLeft className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-slate-800/80 rounded-xl text-center text-slate-600 text-xs">
                  <span>{isRtl ? 'موقعیتی در این ستون نیست' : 'No applications'}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
