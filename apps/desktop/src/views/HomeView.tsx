import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore.js';
import { useApplicationStore } from '../stores/applicationStore.js';
import { useProfileStore } from '../stores/profileStore.js';
import {
  UploadCloud,
  Sparkles,
  TrendingUp,
  CheckCircle,
  ShieldCheck,
  ArrowUpRight,
  UserCheck,
  ListTodo,
} from 'lucide-react';

export const HomeView: React.FC = () => {
  const { t } = useTranslation();
  const { setCurrentView } = useAppStore();
  const { getKpis } = useApplicationStore();
  const { profile } = useProfileStore();
  const kpis = getKpis();

  const candidateEmail = profile?.contact.email || 'ferdouskazemi1000@gmail.com';
  const candidateName = profile?.contact.fullName || 'فردوس کاظمی';

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full bg-[#111111] text-[#f4f4f5]">
      {/* Welcome Banner (Flash-Rive Obsidian Glass Card) */}
      <div className="rounded-2xl border border-[#282828] bg-gradient-to-br from-[#161d26] via-[#161616] to-[#121212] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              LOCAL-FIRST ATS
            </span>
            <span className="text-xs text-[#a1a1aa]">بدون نیاز به API پولی یا ارسال داده به خارج از دستگاه</span>
          </div>
          <h1 className="text-2xl font-bold text-[#f4f4f5] tracking-tight">
            خوش آمدید به {t('app.name')}
          </h1>
          <p className="text-xs text-[#a1a1aa] max-w-xl leading-relaxed">
            دستیار هوشمند شما برای استخراج پروفایل از رزومه، جستجوی خودکار فرصت‌های زنده شغلی (Ashby, Greenhouse, Lever)، تولید مدارک اختصاصی و ارسال امن در حالت بازبینی (Review Mode).
          </p>

          {/* Active Candidate Pill */}
          <div className="flex items-center gap-2 pt-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#141414] border border-[#2a2a2a] text-xs">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[#a1a1aa]">{candidateName}:</span>
              <span className="font-mono text-emerald-400 font-medium">{candidateEmail}</span>
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setCurrentView('profile')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>مدیریت رزومه و پروفایل</span>
          </button>
          <button
            onClick={() => setCurrentView('queue')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#202020] hover:bg-[#282828] border border-[#303030] text-[#f4f4f5] font-medium text-xs transition-all active:scale-95 cursor-pointer"
          >
            <ListTodo className="w-4 h-4 text-emerald-400" />
            <span>مشاهده صف ارسال</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl border border-[#242424] bg-[#161616] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[#a1a1aa]">
            <span className="text-xs font-medium">درخواست‌های این هفته</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#f4f4f5]">{kpis.thisWeek}</span>
            <span className="text-[11px] text-[#71717a] font-mono">هدف: ۱۰ در هفته</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#242424] bg-[#161616] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[#a1a1aa]">
            <span className="text-xs font-medium">میانگین امتیاز انطباق</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#f4f4f5]">{kpis.avgScore}%</span>
            <span className="text-[11px] text-emerald-400 font-mono">محاسبه محلی با LLM</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#242424] bg-[#161616] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[#a1a1aa]">
            <span className="text-xs font-medium">نرخ دعوت به مصاحبه</span>
            <CheckCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-300">{kpis.interviewRate}%</span>
            <span className="text-[11px] text-[#71717a] font-mono">از درخواست‌های ارسال‌شده</span>
          </div>
        </div>

        <div className="rounded-xl border border-[#242424] bg-[#161616] p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[#a1a1aa]">
            <span className="text-xs font-medium">حریم خصوصی و داده‌ها</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-emerald-400 font-mono">۱۰۰٪ آفلاین و محلی</span>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => setCurrentView('profile')}
          className="group rounded-xl border border-[#262626] bg-[#161616] hover:bg-[#1a1a1a] hover:border-[#383838] p-5 cursor-pointer transition-all flex flex-col justify-between gap-4"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <UploadCloud className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#71717a] group-hover:text-sky-400 transition-colors" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#f4f4f5] group-hover:text-sky-400 transition-colors">
              استخراج هوشمند و اعتبارسنجی رزومه
            </h3>
            <p className="text-[11px] text-[#a1a1aa] mt-1 leading-relaxed">
              پشتیبانی از PDF استاندارد با PDF.js و Mammoth بدون هیچ‌گونه بایت‌کد یا کاراکترهای نامفهوم، با اتصال مستقیم به اطلاعات واقعی شما.
            </p>
          </div>
        </div>

        <div
          onClick={() => setCurrentView('jobs')}
          className="group rounded-xl border border-[#262626] bg-[#161616] hover:bg-[#1a1a1a] hover:border-[#383838] p-5 cursor-pointer transition-all flex flex-col justify-between gap-4"
        >
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#71717a] group-hover:text-emerald-400 transition-colors" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#f4f4f5] group-hover:text-emerald-400 transition-colors">
              فرصت‌های شغلی زنده (Live Boards)
            </h3>
            <p className="text-[11px] text-[#a1a1aa] mt-1 leading-relaxed">
              فرصت‌های شغلی ۱۰۰٪ زنده از بردهای رسمی Ashby (Linear, Ramp, OpenAI) و Greenhouse (GitLab, Cloudflare, Canonical) بدون داده‌های ساختگی.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
