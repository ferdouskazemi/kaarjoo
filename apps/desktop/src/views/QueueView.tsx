import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Play,
  Send,
  Trash2,
  Eye,
  FileText,
  Building2,
  Clock,
  Sparkles,
  Lock,
  Loader2,
  Maximize2,
  X,
  Compass,
} from 'lucide-react';
import { useApplicationStore } from '../stores/applicationStore.js';
import { ApplicationRecord } from '@kaarjoo/shared';

export const QueueView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';

  const {
    applications,
    activeApplicationId,
    isExecuting,
    currentStep,
    executeApplication,
    submitReviewed,
    cancelApplication,
    setActiveApplicationId,
  } = useApplicationStore();

  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  const activeApp: ApplicationRecord | undefined =
    applications.find((a) => a.id === activeApplicationId) || applications[0];

  const getStatusBadge = (status: ApplicationRecord['status']) => {
    switch (status) {
      case 'needs_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Eye className="w-3.5 h-3.5" />
            {isRtl ? 'آماده بررسی نهایی' : 'Needs Review'}
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-300 border border-sky-500/30">
            <Clock className="w-3.5 h-3.5" />
            {isRtl ? 'در صف آماده‌سازی' : 'Queued'}
          </span>
        );
      case 'filling':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {isRtl ? 'در حال تکمیل...' : 'Filling...'}
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isRtl ? 'ارسال شده' : 'Submitted'}
          </span>
        );
      case 'needs_user':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            {isRtl ? 'نیازمند اقدام کاربر' : 'Needs User Action'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
            {status}
          </span>
        );
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
      <span className={`px-2 py-0.5 rounded text-[11px] font-mono border uppercase tracking-wider ${colors[ats] || colors.generic}`}>
        {ats}
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Top Header & Review Mode Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-100">{t('nav.queue')}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
              {applications.length} موقعیت
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {isRtl
              ? 'اتوماسیون هدایت فرم‌های ATS در حالت بازبینی (Review Mode): تمام فیلدها و پاسخ‌ها قبل از ثبت نهایی به تایید شما می‌رسند.'
              : 'ATS application engine in Review Mode: All fields and answers are validated by you before final submission.'}
          </p>
        </div>

        {/* Review Mode Guarantees Badge */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-medium">{isRtl ? 'حالت بازبینی پیش‌فرض' : 'Review Mode'}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-sky-400" />
            <span>{isRtl ? 'عدم دور زدن کپچا (اخلاقی)' : 'No Captcha Bypass'}</span>
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-16 text-center flex flex-col items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-base font-semibold text-slate-200">صف ارسال‌ها خالی است</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            از بخش «مشاغل»، موقعیت مورد نظر خود را انتخاب کرده و پس از شخصی‌سازی مدارک، دکمه «انتقال به صف ارسال» را بزنید.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Applications List (Cards) */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              {isRtl ? 'درخواست‌های در صف' : 'Queued Applications'} ({applications.length})
            </h2>

            <div className="flex flex-col gap-2.5">
              {applications.map((app) => {
                const isSelected = app.id === activeApp?.id;
                return (
                  <div
                    key={app.id}
                    onClick={() => setActiveApplicationId(app.id)}
                    className={`cursor-pointer rounded-xl p-4 border transition-all text-start ${
                      isSelected
                        ? 'bg-slate-800/90 border-sky-500/50 shadow-lg shadow-sky-950/20 ring-1 ring-sky-500/30'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-300">{app.company}</span>
                      </div>
                      {getAtsBadge(app.atsType)}
                    </div>

                    <h3 className="text-sm font-semibold text-slate-100 line-clamp-1 mb-3">
                      {app.jobTitle}
                    </h3>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
                      {getStatusBadge(app.status)}
                      <span className="text-[11px] text-slate-500">
                        {app.reviewChecklist.length > 0
                          ? `${app.reviewChecklist.filter((c) => c.status === 'ok').length}/${app.reviewChecklist.length} فیلد`
                          : 'آماده پردازش'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Application Inspector & Review Center */}
          {activeApp && (
            <div className="lg:col-span-8 flex flex-col gap-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              {/* Active Application Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-400">{activeApp.company}</span>
                    <span className="text-slate-600">•</span>
                    {getAtsBadge(activeApp.atsType)}
                    <span className="text-slate-600">•</span>
                    {getStatusBadge(activeApp.status)}
                  </div>
                  <h2 className="text-xl font-bold text-slate-100">{activeApp.jobTitle}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={activeApp.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {isRtl ? 'مشاهده آگهی' : 'View Posting'}
                  </a>
                  <button
                    onClick={() => cancelApplication(activeApp.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title={isRtl ? 'حذف از صف' : 'Remove from queue'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stop-and-Ask Alert Banner (if StopReason detected) */}
              {activeApp.status === 'needs_user' && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 flex items-start gap-3 text-rose-200">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <h4 className="font-semibold text-sm mb-1">
                      {isRtl ? 'توقف و درخواست اقدام کاربر (Stop & Ask)' : 'User Action Required'}
                    </h4>
                    <p className="text-rose-300/90 leading-relaxed">
                      {activeApp.stopMessage ||
                        (isRtl
                          ? 'سامانه امنیتی (کپچا) یا نیاز به ورود با حساب کاربری در صفحه شناسایی شد. سیستم به دلیل اصول ایمنی کپچا را دور نمی‌زند. پنجره مرورگر را باز کرده و ادامه دهید.'
                          : 'Anti-bot challenge or login detected. The browser is ready for you to complete.')}
                    </p>
                  </div>
                </div>
              )}

              {/* Execution Progress Bar (When filling or reviewing) */}
              {isExecuting && (
                <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-800/60 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-sky-400 animate-spin shrink-0" />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-sky-300 block mb-0.5">
                      {isRtl ? 'در حال اجرای فرآیند اتوماسیون Playwright' : 'Playwright Automation in Progress'}
                    </span>
                    <span className="text-slate-400">{isRtl ? currentStep.messageFa : currentStep.messageEn}</span>
                  </div>
                </div>
              )}

              {/* Main Content: Split into Screenshot Preview & Verification Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left/Upper: Browser Snapshot Thumbnail */}
                <div className="md:col-span-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-sky-400" />
                      {isRtl ? 'پیش‌نمایش زنده مرورگر' : 'Live Browser Snapshot'}
                    </span>
                    {activeApp.screenshotBeforeSubmit && (
                      <button
                        onClick={() => setPreviewModalImg(activeApp.screenshotBeforeSubmit || null)}
                        className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
                      >
                        <Maximize2 className="w-3 h-3" />
                        {isRtl ? 'بزرگنمایی' : 'Expand'}
                      </button>
                    )}
                  </div>

                  <div
                    onClick={() => activeApp.screenshotBeforeSubmit && setPreviewModalImg(activeApp.screenshotBeforeSubmit)}
                    className="relative rounded-xl border border-slate-800 overflow-hidden bg-slate-950 group cursor-pointer aspect-video flex items-center justify-center"
                  >
                    {activeApp.screenshotBeforeSubmit ? (
                      <>
                        <img
                          src={activeApp.screenshotBeforeSubmit}
                          alt="Browser snapshot"
                          className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2.5">
                          <span className="text-[10px] text-slate-300 font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700">
                            {isRtl ? 'گام بازبینی نهایی (پیش از کلیک ارسال)' : 'Final Review Step'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-6 text-center flex flex-col items-center justify-center text-slate-600">
                        <Compass className="w-8 h-8 mb-2 stroke-1" />
                        <span className="text-xs">
                          {isRtl ? 'تصویر صفحه پس از شروع تکمیل فرم نمایش داده می‌شود' : 'Snapshot captured during filling'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tailored Documents Attached Pill */}
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0 text-xs">
                      <span className="text-slate-300 font-medium block truncate">
                        {activeApp.tailoredResumePath ? activeApp.tailoredResumePath.split('\\').pop() : 'رزومه آماده ارسال'}
                      </span>
                      <span className="text-[10px] text-emerald-400/90 font-mono">
                        {isRtl ? 'تطبیق داده شده برای سیستم‌های ATS' : 'ATS-Optimized'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right/Lower: Verification Checklist */}
                <div className="md:col-span-7 flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {isRtl ? 'چک‌لیست داده‌های وارد شده' : 'Filled Values Checklist'}
                  </span>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 max-h-[340px] overflow-y-auto flex flex-col gap-2">
                    {activeApp.reviewChecklist.length > 0 ? (
                      activeApp.reviewChecklist.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 text-xs"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            {item.status === 'ok' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : item.status === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            ) : (
                              <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0">
                              <span className="font-medium text-slate-200 block truncate">{item.label}</span>
                              <span className="text-[11px] text-slate-400 font-mono truncate block">{item.value}</span>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-slate-800 text-slate-400 shrink-0">
                            {item.category}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center">
                        <Play className="w-6 h-6 text-slate-600 mb-2" />
                        <span>{isRtl ? 'دکمه «تکمیل خودکار فرم» را بزنید تا چک‌لیست استخراج گردد' : 'Click "Start Filling" to generate checklist'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800 mt-1">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {activeApp.status === 'submitted'
                      ? isRtl
                        ? 'درخواست شما با موفقیت ثبت شد و در سیستم ذخیره گردید.'
                        : 'Application confirmed and recorded.'
                      : isRtl
                      ? 'فرم تکمیل شده؛ با کلیک دکمه زیر، درخواست نهایی ارسال می‌شود.'
                      : 'Form filled; click to execute final submission.'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {activeApp.status === 'queued' ? (
                    <button
                      onClick={() => executeApplication(activeApp.id)}
                      disabled={isExecuting}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all disabled:opacity-50"
                    >
                      <Play className="w-4 h-4" />
                      {isRtl ? 'شروع فرآیند تکمیل فرم (Playwright)' : 'Start Automated Filling'}
                    </button>
                  ) : activeApp.status === 'needs_review' ? (
                    <button
                      onClick={() => submitReviewed(activeApp.id)}
                      disabled={isExecuting}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {isRtl ? 'تأیید و ارسال نهایی فرم' : 'Approve & Submit Application'}
                    </button>
                  ) : activeApp.status === 'submitted' ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      {isRtl ? 'ثبت شده در سیستم' : 'Application Recorded'}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Screenshot Zoom Modal */}
      {previewModalImg && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-5xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <span className="text-sm font-semibold text-slate-200">
                {isRtl ? 'اسکرین‌شات تأییدیه گام نهایی در مرورگر' : 'Final Step Browser Screenshot'}
              </span>
              <button
                onClick={() => setPreviewModalImg(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-slate-950 flex items-center justify-center">
              <img src={previewModalImg} alt="Expanded snapshot" className="max-w-full rounded-lg border border-slate-800" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
