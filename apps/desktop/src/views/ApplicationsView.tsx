import React from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';

export const ApplicationsView: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{t('nav.applications')}</h1>
          <p className="text-sm text-slate-400 mt-1">
            پیگیری وضعیت درخواست‌ها در قالب Kanban و جدول همراه با سوابق کامل اسناد ارسالی.
          </p>
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white">
          <Download className="w-3.5 h-3.5" />
          <span>خروجی CSV</span>
        </button>
      </div>

      {/* Kanban Board Columns Mock for Shell */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {['ذخیره‌شده', 'آماده ارسال', 'ارسال‌شده', 'مصاحبه', 'رد شده / پذیرش'].map((col, idx) => (
          <div key={idx} className="rounded-xl border border-slate-800/80 bg-slate-900/20 p-3 flex flex-col gap-2 min-h-64">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
              <span className="text-xs font-semibold text-slate-300">{col}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">۰</span>
            </div>
            <div className="flex-1 flex items-center justify-center text-[11px] text-slate-600">
              خالی
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
