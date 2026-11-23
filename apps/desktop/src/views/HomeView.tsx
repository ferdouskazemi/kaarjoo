import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore';
import { UploadCloud, Sparkles, TrendingUp, CheckCircle, ShieldCheck, ArrowUpRight } from 'lucide-react';

export const HomeView: React.FC = () => {
  const { t } = useTranslation();
  const { setCurrentView } = useAppStore();

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900/50 to-slate-950 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Local-First AI
            </span>
            <span className="text-xs text-slate-400">بدون نیاز به API پولی یا اشتراک ابری</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
            خوش آمدید به {t('app.name')}
          </h1>
          <p className="text-sm text-slate-400 max-w-xl">
            دستیار هوشمند شما برای استخراج پروفایل از رزومه، جستجوی خودکار فرصت‌های شغلی منطقه‌ای و بین‌المللی، تولید مدارک اختصاصی و ارسال امن.
          </p>
        </div>

        <button
          onClick={() => setCurrentView('profile')}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98]"
        >
          <UploadCloud className="w-4 h-4" />
          <span>بارگذاری رزومه</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">درخواست‌های این هفته</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">۰</span>
            <span className="text-xs text-slate-500">هدف: ۱۰ در هفته</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">میانگین امتیاز انطباق</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">--</span>
            <span className="text-xs text-emerald-400">محاسبه محلی با LLM</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">نرخ پاسخ کارفرمایان</span>
            <CheckCircle className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-100">-- %</span>
            <span className="text-xs text-slate-500">در انتظار اولین بازخورد</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">حریم خصوصی و داده‌ها</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-emerald-400">۱۰۰٪ آفلاین و محلی</span>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => setCurrentView('profile')}
          className="group rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 p-5 cursor-pointer transition-all flex flex-col justify-between gap-4"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <UploadCloud className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">
              استخراج هوشمند پروفایل
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              پشتیبانی از PDF، فایل‌های DOCX، اسکن‌های تصویری، رزومه‌های لینکدین و استخراج حقایق با ذکر دقیق منبع و مختصات سند.
            </p>
          </div>
        </div>

        <div
          onClick={() => setCurrentView('jobs')}
          className="group rounded-xl border border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 p-5 cursor-pointer transition-all flex flex-col justify-between gap-4"
        >
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
              فرصت‌های شغلی منطبق
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              جستجو در منابع معتبر (ACBAR، Jobs.af، Lever، Greenhouse و بردهای دورکاری) بر پایه متادیتا و اسکیماهای استاندارد.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
