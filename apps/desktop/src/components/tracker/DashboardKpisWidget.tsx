import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  Sparkles,
  BookOpen,
  CalendarCheck,
  Building,
  Target,
} from 'lucide-react';
import { ApplicationKpis } from '../../stores/applicationStore.js';

interface DashboardKpisWidgetProps {
  kpis: ApplicationKpis;
}

export const DashboardKpisWidget: React.FC<DashboardKpisWidgetProps> = ({ kpis }) => {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Applications */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">
              {isRtl ? 'کل موقعیت‌های پیگیری‌شده' : 'Total Applications'}
            </span>
            <Target className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-100">{kpis.total}</span>
            <span className="text-[11px] text-slate-500">
              {isRtl ? 'در سراسر بوردها' : 'Across all boards'}
            </span>
          </div>
        </div>

        {/* Applied This Week */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">
              {isRtl ? 'ارسال‌های این هفته' : 'This Week Submissions'}
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-400">{kpis.thisWeek}</span>
            <span className="text-[11px] text-slate-500 font-mono">
              {isRtl ? 'هدف: ۱۰ در هفته' : 'Goal: 10 / wk'}
            </span>
          </div>
        </div>

        {/* Interview Rate */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">
              {isRtl ? 'نرخ تبدیل به مصاحبه' : 'Interview Conversion'}
            </span>
            <CalendarCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-amber-300">{kpis.interviewRate}%</span>
            <span className="text-[11px] text-amber-400/80 font-mono">
              {isRtl ? 'دعوت به مصاحبه / آفر' : 'Interviews / Offers'}
            </span>
          </div>
        </div>

        {/* Average Match Score */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 flex flex-col justify-between gap-3 shadow-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-300">
              {isRtl ? 'میانگین نمره انطباق محلی' : 'Avg Local Match'}
            </span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-purple-300">{kpis.avgScore}%</span>
            <span className="text-[11px] text-purple-400/80">
              {isRtl ? 'محاسبه بدون کلید API' : '100% Local AI'}
            </span>
          </div>
        </div>
      </div>

      {/* Actionable Learning Suggestions & Source Performance Banner */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
        {/* Top Missing Skills / Learning Roadmap */}
        <div className="md:col-span-8 p-4 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-slate-200">
                {isRtl ? 'پیشنهاد یادگیری: مهارت‌های پرتکرار مفقود در فرصت‌های برتر' : 'Learning Suggestions (Top Missing Skills)'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">
              {isRtl ? 'تحلیل خودکار آگهی‌ها' : 'Auto analyzed'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {kpis.topMissingSkills.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/60 border border-slate-800 text-xs"
              >
                <span className="text-slate-300 font-medium">{item.skill}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                  {item.count} موقعیت
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ATS Source Performance */}
        <div className="md:col-span-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/40 flex flex-col justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-slate-200">
              {isRtl ? 'توزیع بوردها' : 'Source Distribution'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {Object.entries(kpis.atsDistribution).map(([ats, count]) => (
              <span
                key={ats}
                className="px-2 py-0.5 rounded-lg text-[10px] font-mono uppercase bg-slate-950 border border-slate-800 text-slate-400"
              >
                {ats}: <strong className="text-slate-200">{count}</strong>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
