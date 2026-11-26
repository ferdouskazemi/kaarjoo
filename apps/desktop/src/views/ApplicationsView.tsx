import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  LayoutGrid,
  List,
  CheckCircle2,
} from 'lucide-react';
import { useApplications, useUpdateApplicationStatus } from '../queries/index.js';
import { useApplicationStore } from '../stores/applicationStore.js';
import { useAppStore } from '../stores/appStore.js';
import { commands } from '../bindings.js';
import { KanbanBoard } from '../components/tracker/KanbanBoard.js';
import { ApplicationsTableView } from '../components/tracker/ApplicationsTableView.js';
import { ApplicationDetailDrawer } from '../components/tracker/ApplicationDetailDrawer.js';
import { DashboardKpisWidget } from '../components/tracker/DashboardKpisWidget.js';
import { formatNumber } from '../utils/formatters.js';
import type { ApplicationRecord, ApplicationStatus, AtsType } from '@kaarjoo/shared';

export const ApplicationsView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { demoMode } = useAppStore();
  const { data: dbApplications = [], refetch: refetchApps } = useApplications();
  const updateStatusMutation = useUpdateApplicationStatus();

  const {
    applications: storeApps,
    updateApplicationStatus,
    updateApplicationNotes,
    scheduleInterview,
    cancelApplication,
  } = useApplicationStore();

  const isUsingDb = dbApplications.length > 0;
  const applications: ApplicationRecord[] = useMemo(() => {
    if (isUsingDb) {
      return dbApplications.map((a) => ({
        id: a.id,
        jobId: a.jobId,
        jobTitle: a.jobTitle,
        company: a.company,
        location: a.location ?? undefined,
        applyUrl: a.applyUrl,
        atsType: (a.atsType as AtsType) ?? 'generic',
        mode: (a.mode as any) ?? 'review',
        status: (a.status as ApplicationStatus) ?? 'saved',
        matchScore: a.matchScore ?? undefined,
        profileId: a.profileId,
        tailoredResumePath: a.tailoredResumePath ?? undefined,
        coverLetterText: a.coverLetterText ?? undefined,
        notes: a.notes ?? undefined,
        interviewDate: a.interviewDate ?? undefined,
        submittedAt: a.submittedAt ?? undefined,
        screenshotBeforeSubmit: a.screenshotBeforeSubmit ?? undefined,
        screenshotConfirmation: a.screenshotConfirmation ?? undefined,
        filledFields: (a.filledFields as any) ?? [],
        reviewChecklist: (a.reviewChecklist as any) ?? [],
        timeline: (a.timeline as any) ?? [],
        stopReason: 'none',
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }));
    }
    return demoMode || storeApps.length > 0 ? storeApps : [];
  }, [isUsingDb, dbApplications, demoMode, storeApps]);

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [isExportSuccess, setIsExportSuccess] = useState(false);

  const kpis = useMemo(() => {
    const total = applications.length;
    const oneWeekAgo = Date.now() - 7 * 86400000;
    const thisWeek = applications.filter((a) => {
      const time = a.submittedAt ? new Date(a.submittedAt).getTime() : new Date(a.createdAt).getTime();
      return time >= oneWeekAgo;
    }).length;
    const appliedOrBeyond = applications.filter((a) =>
      ['applied', 'submitted', 'interview', 'offer', 'rejected'].includes(a.status)
    ).length;
    const interviewsOrOffers = applications.filter((a) => ['interview', 'offer'].includes(a.status)).length;
    const interviewRate = appliedOrBeyond > 0 ? Math.round((interviewsOrOffers / appliedOrBeyond) * 100) : 0;
    const scoredApps = applications.filter((a) => typeof a.matchScore === 'number' && a.matchScore > 0);
    const avgScore =
      scoredApps.length > 0
        ? Math.round(scoredApps.reduce((acc, a) => acc + (a.matchScore || 0), 0) / scoredApps.length)
        : 0;
    const atsDistribution: Record<string, number> = {};
    for (const a of applications) {
      atsDistribution[a.atsType] = (atsDistribution[a.atsType] || 0) + 1;
    }
    return {
      total,
      thisWeek,
      interviewRate,
      avgScore,
      topMissingSkills: [] as Array<{ skill: string; count: number }>,
      atsDistribution,
    };
  }, [applications]);

  const handleMoveStatus = async (id: string, status: ApplicationStatus) => {
    if (isUsingDb) {
      await updateStatusMutation.mutateAsync({ id, status });
      await refetchApps();
    } else {
      updateApplicationStatus(id, status);
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    if (isUsingDb) {
      await commands.applicationsUpdateNotes(id, notes);
      await refetchApps();
    } else {
      updateApplicationNotes(id, notes);
    }
  };

  const handleDeleteApp = async (id: string) => {
    if (isUsingDb) {
      await updateStatusMutation.mutateAsync({ id, status: 'withdrawn' });
      await refetchApps();
    } else {
      cancelApplication(id);
    }
  };

  const handleDownloadCsv = () => {
    const headers = ['ID', 'Company', 'Role', 'ATS', 'Status', 'Score', 'Salary', 'URL', 'CreatedAt', 'SubmittedAt', 'Notes'];
    const rows = applications.map((a) => [
      a.id,
      `"${a.company.replace(/"/g, '""')}"`,
      `"${a.jobTitle.replace(/"/g, '""')}"`,
      a.atsType,
      a.status,
      a.matchScore ?? '',
      `"${(a.salaryText || '').replace(/"/g, '""')}"`,
      `"${a.applyUrl}"`,
      a.createdAt,
      a.submittedAt || '',
      `"${(a.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `kaarjoo_applications_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExportSuccess(true);
    setTimeout(() => setIsExportSuccess(false), 2500);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-100">{t('tracker.title')}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {formatNumber(applications.length, i18n.language)} {t('tracker.recordedPositions')}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {t('tracker.subtitle')}
          </p>
        </div>

        {/* View Mode Switcher & CSV Export Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{t('tracker.kanbanView')}</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{t('tracker.tableView')}</span>
            </button>
          </div>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            {isExportSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{isExportSuccess ? t('tracker.downloadSuccess') : t('tracker.exportCsv')}</span>
          </button>
        </div>
      </div>

      {/* Top Dashboard KPIs Widget */}
      <DashboardKpisWidget kpis={kpis} />

      {/* Main View Area (Kanban or Table) */}
      {viewMode === 'kanban' ? (
        <KanbanBoard
          applications={applications}
          onSelectApplication={setSelectedApp}
          onMoveStatus={handleMoveStatus}
        />
      ) : (
        <ApplicationsTableView
          applications={applications}
          onSelectApplication={setSelectedApp}
          onMoveStatus={handleMoveStatus}
          onDeleteApplication={handleDeleteApp}
        />
      )}

      {/* Application Detail Drawer Modal */}
      <ApplicationDetailDrawer
        application={selectedApp}
        onClose={() => setSelectedApp(null)}
        onUpdateStatus={handleMoveStatus}
        onUpdateNotes={handleUpdateNotes}
        onScheduleInterview={scheduleInterview}
      />
    </div>
  );
};
