import React from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Filter, Search } from 'lucide-react';

export const JobsView: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{t('nav.jobs')}</h1>
          <p className="text-sm text-slate-400 mt-1">
            فرصت‌های شغلی کشف‌شده از آداپتورهای عمومی و سیستم‌های ATS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
            <input
              type="text"
              placeholder="جستجو در عناوین و شرکت‌ها..."
              className="ps-9 pe-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white">
            <Filter className="w-3.5 h-3.5" />
            <span>فیلترها</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 p-12 text-center flex flex-col items-center justify-center">
        <Briefcase className="w-10 h-10 text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-300">هنوز فرصت شغلی ثبت نشده است</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          پس از تکمیل پروفایل در فاز ۱ و اجرای آداپتورهای جستجو در فاز ۲، مشاغل منطبق در این بخش نمایش داده می‌شوند.
        </p>
      </div>
    </div>
  );
};
