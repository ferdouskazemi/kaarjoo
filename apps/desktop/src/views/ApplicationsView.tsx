import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  LayoutGrid,
  List,
  CheckCircle2,
} from 'lucide-react';
import { useApplicationStore } from '../stores/applicationStore.js';
import { KanbanBoard } from '../components/tracker/KanbanBoard.js';
import { ApplicationsTableView } from '../components/tracker/ApplicationsTableView.js';
import { ApplicationDetailDrawer } from '../components/tracker/ApplicationDetailDrawer.js';
import { DashboardKpisWidget } from '../components/tracker/DashboardKpisWidget.js';
import { ApplicationRecord } from '@kaarjoo/shared';

export const ApplicationsView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const {
    applications,
    updateApplicationStatus,
    updateApplicationNotes,
    scheduleInterview,
    cancelApplication,
    exportToCsv,
    getKpis,
  } = useApplicationStore();

  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [isExportSuccess, setIsExportSuccess] = useState(false);

  const kpis = getKpis();

  const handleDownloadCsv = () => {
    const csvContent = exportToCsv();
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
            <h1 className="text-2xl font-bold text-slate-100">{t('nav.applications')}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {applications.length} موقعیت ثبت‌شده
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {isRtl
              ? 'پیگیری جامع وضعیت درخواست‌ها در قالب بورد Kanban و جدول به همراه تاریخچه اسناد و یادداشت‌های مصاحبه.'
              : 'Interactive Kanban pipeline and table tracker with full document snapshots, timeline, and interview notes.'}
          </p>
        </div>

        {/* View Mode Switcher & CSV Export Button */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1 text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{isRtl ? 'بورد کانبان' : 'Kanban'}</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>{isRtl ? 'نمای جدول' : 'Table'}</span>
            </button>
          </div>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs text-slate-200 hover:text-white transition-colors"
          >
            {isExportSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{isExportSuccess ? (isRtl ? 'دانلود شد!' : 'Downloaded!') : (isRtl ? 'خروجی CSV' : 'Export CSV')}</span>
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
          onMoveStatus={updateApplicationStatus}
        />
      ) : (
        <ApplicationsTableView
          applications={applications}
          onSelectApplication={setSelectedApp}
          onMoveStatus={updateApplicationStatus}
          onDeleteApplication={cancelApplication}
        />
      )}

      {/* Application Detail Drawer Modal */}
      <ApplicationDetailDrawer
        application={selectedApp}
        onClose={() => setSelectedApp(null)}
        onUpdateStatus={updateApplicationStatus}
        onUpdateNotes={updateApplicationNotes}
        onScheduleInterview={scheduleInterview}
      />
    </div>
  );
};
