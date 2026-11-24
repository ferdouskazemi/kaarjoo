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
  UserCheck,
} from 'lucide-react';
import { useApplicationStore } from '../stores/applicationStore.js';
import { useProfileStore } from '../stores/profileStore.js';
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

  const { profile } = useProfileStore();

  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);

  const activeApp: ApplicationRecord | undefined =
    applications.find((a) => a.id === activeApplicationId) || applications[0];

  const getStatusBadge = (status: ApplicationRecord['status']) => {
    switch (status) {
      case 'needs_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#2b2414] text-amber-300 border border-amber-500/40 font-mono">
            <Eye className="w-3 h-3 text-amber-400" />
            {isRtl ? 'آماده بررسی نهایی' : 'Needs Review'}
          </span>
        );
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#142332] text-sky-300 border border-sky-500/40 font-mono">
            <Clock className="w-3 h-3 text-sky-400" />
            {isRtl ? 'در صف آماده‌سازی' : 'Queued'}
          </span>
        );
      case 'filling':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#1e1c36] text-violet-300 border border-violet-500/40 animate-pulse font-mono">
            <Loader2 className="w-3 h-3 animate-spin text-violet-400" />
            {isRtl ? 'در حال تکمیل...' : 'Filling...'}
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#182a20] text-emerald-300 border border-emerald-500/40 font-mono">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            {isRtl ? 'ارسال شده' : 'Submitted'}
          </span>
        );
      case 'needs_user':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#311818] text-rose-300 border border-rose-500/40 font-mono">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            {isRtl ? 'نیازمند اقدام کاربر' : 'Needs User Action'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#202020] text-[#a1a1aa] font-mono">
            {status}
          </span>
        );
    }
  };

  const getAtsBadge = (ats: string) => {
    const colors: Record<string, string> = {
      greenhouse: 'bg-[#14261d] text-emerald-300 border-emerald-500/30',
      lever: 'bg-[#142233] text-sky-300 border-sky-500/30',
      ashby: 'bg-[#251833] text-purple-300 border-purple-500/30',
      workable: 'bg-[#142a27] text-teal-300 border-teal-500/30',
      generic: 'bg-[#1f1f1f] text-[#a1a1aa] border-[#2f2f2f]',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider ${colors[ats] || colors.generic}`}>
        {ats}
      </span>
    );
  };

  const candidateEmail = profile?.contact.email || 'ferdouskazemi1000@gmail.com';
  const candidateName = profile?.contact.fullName || (isRtl ? 'فردوس کاظمی' : 'Ferdous Kazemi');

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 max-w-7xl mx-auto w-full bg-[#111111] text-[#f4f4f5]">
      {/* Top Header & Review Mode Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#242424]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[#f4f4f5]">{t('nav.queue')}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#142233] text-sky-300 border border-sky-500/30">
              {applications.length} {isRtl ? 'موقعیت' : 'Positions'}
            </span>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-1">
            {isRtl
              ? 'اتوماسیون هدایت فرم‌های ATS در حالت بازبینی (Review Mode): تمام فیلدها قبل از ثبت نهایی با رزومه تأییدشده شما چک می‌شوند.'
              : 'ATS application engine in Review Mode: All fields are validated before submission.'}
          </p>
        </div>

        {/* Candidate & Review Mode Guarantees Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-xs">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[#a1a1aa]">{candidateName}:</span>
            <span className="font-mono text-emerald-400 font-medium">{candidateEmail}</span>
          </div>

          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#181818] border border-[#282828] text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-medium">{isRtl ? 'حالت بازبینی پیش‌فرض' : 'Review Mode'}</span>
            </div>
            <span className="text-[#333333]">|</span>
            <div className="flex items-center gap-1 text-[#a1a1aa]">
              <Lock className="w-3 h-3 text-sky-400" />
              <span>{isRtl ? 'عدم دور زدن کپچا (اخلاقی)' : 'Ethical Guard'}</span>
            </div>
          </div>
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-[#242424] bg-[#161616] p-16 text-center flex flex-col items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-[#444444] mb-4" />
          <h3 className="text-sm font-semibold text-[#f4f4f5]">
            {isRtl ? 'صف ارسال‌ها خالی است' : 'Application queue is empty'}
          </h3>
          <p className="text-xs text-[#a1a1aa] mt-1 max-w-sm">
            {isRtl
              ? 'از بخش «فرصت‌های شغلی»، موقعیت زنده مورد نظر خود را انتخاب کرده و دکمه «انتقال به صف ارسال» را بزنید.'
              : 'From "Live Opportunities", select a position and queue it for review-mode application.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Applications List (Cards) */}
          <div className="lg:col-span-4 flex flex-col gap-2.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#a1a1aa] px-1">
              {isRtl ? 'درخواست‌های در صف' : 'Queued Applications'} ({applications.length})
            </h2>

            <div className="flex flex-col gap-2">
              {applications.map((app) => {
                const isSelected = app.id === activeApp?.id;
                return (
                  <div
                    key={app.id}
                    onClick={() => setActiveApplicationId(app.id)}
                    className={`cursor-pointer rounded-xl p-3.5 border transition-all text-start ${
                      isSelected
                        ? 'bg-[#1e1e1e] border-sky-500/50 shadow-lg active-ring'
                        : 'bg-[#161616] border-[#262626] hover:border-[#383838] hover:bg-[#1a1a1a]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#a1a1aa]" />
                        <span className="text-xs font-semibold text-[#f4f4f5]">{app.company}</span>
                      </div>
                      {getAtsBadge(app.atsType)}
                    </div>

                    <h3 className="text-xs font-medium text-[#e4e4e7] line-clamp-1 mb-2">
                      {app.jobTitle}
                    </h3>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-[#242424]">
                      {getStatusBadge(app.status)}
                      <span className="text-[10px] font-mono text-[#71717a]">
                        {app.reviewChecklist.length > 0
                          ? isRtl
                            ? `${app.reviewChecklist.length} فیلد`
                            : `${app.reviewChecklist.length} fields`
                          : isRtl
                          ? 'آماده پردازش'
                          : 'Ready'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Application Inspection & Approval View */}
          {activeApp && (
            <div className="lg:col-span-8 rounded-2xl border border-[#282828] bg-[#161616] p-5 flex flex-col gap-5 shadow-sm">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#242424]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[#a1a1aa]">{activeApp.company}</span>
                    <span className="text-[#383838]">•</span>
                    {getAtsBadge(activeApp.atsType)}
                    <span className="text-[#383838]">•</span>
                    {getStatusBadge(activeApp.status)}
                  </div>
                  <h2 className="text-base font-bold text-[#f4f4f5]">{activeApp.jobTitle}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={activeApp.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#202020] hover:bg-[#282828] border border-[#2f2f2f] text-[#d4d4d8] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                    {isRtl ? 'مشاهده آگهی' : 'View Posting'}
                  </a>
                  <button
                    onClick={() => cancelApplication(activeApp.id)}
                    className="p-1.5 rounded-lg text-[#71717a] hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title={isRtl ? 'حذف از صف' : 'Remove from queue'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Stop-and-Ask Alert Banner (if StopReason detected) */}
              {activeApp.status === 'needs_user' && (
                <div className="p-4 rounded-xl bg-[#2b1717] border border-rose-800/80 flex items-start gap-3 text-rose-200">
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
                <div className="p-3.5 rounded-xl bg-[#12222d] border border-sky-500/30 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
                  <div className="flex-1 text-xs">
                    <span className="font-semibold text-sky-300 block mb-0.5">
                      {isRtl ? 'در حال اجرای فرآیند اتوماسیون Playwright' : 'Playwright Automation in Progress'}
                    </span>
                    <span className="text-[#a1a1aa]">{isRtl ? currentStep.messageFa : currentStep.messageEn}</span>
                  </div>
                </div>
              )}

              {/* Main Content: Split into Screenshot Preview & Verification Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left/Upper: Browser Snapshot Thumbnail */}
                <div className="md:col-span-5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#d4d4d8] flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-sky-400" />
                      {isRtl ? 'پیش‌نمایش زنده مرورگر' : 'Live Browser Snapshot'}
                    </span>
                    {activeApp.screenshotBeforeSubmit && (
                      <button
                        onClick={() => setPreviewModalImg(activeApp.screenshotBeforeSubmit || null)}
                        className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Maximize2 className="w-3 h-3" />
                        {isRtl ? 'بزرگنمایی' : 'Expand'}
                      </button>
                    )}
                  </div>

                  <div
                    onClick={() => activeApp.screenshotBeforeSubmit && setPreviewModalImg(activeApp.screenshotBeforeSubmit)}
                    className="relative rounded-xl border border-[#282828] overflow-hidden bg-[#111111] group cursor-pointer aspect-video flex items-center justify-center"
                  >
                    {activeApp.screenshotBeforeSubmit ? (
                      <>
                        <img
                          src={activeApp.screenshotBeforeSubmit}
                          alt="Browser snapshot"
                          className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/90 via-transparent to-transparent flex items-end p-2.5">
                          <span className="text-[10px] text-[#f4f4f5] font-mono bg-[#161616]/90 px-2 py-0.5 rounded border border-[#2b2b2b]">
                            {isRtl ? 'گام بازبینی نهایی (پیش از کلیک ارسال)' : 'Final Review Step'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="p-6 text-center flex flex-col items-center justify-center text-[#52525b]">
                        <Compass className="w-8 h-8 mb-2 stroke-1" />
                        <span className="text-xs">
                          {isRtl ? 'تصویر صفحه پس از شروع تکمیل فرم نمایش داده می‌شود' : 'Snapshot captured during filling'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tailored Documents Attached Pill */}
                  <div className="p-2.5 rounded-xl bg-[#141414] border border-[#242424] flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0 text-xs">
                      <span className="text-[#e4e4e7] font-medium block truncate">
                        {activeApp.tailoredResumePath ? activeApp.tailoredResumePath.split('\\').pop() : 'Ferdous_Kazemi_Resume.pdf'}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {isRtl ? 'تطبیق داده شده برای سیستم‌های ATS' : 'ATS-Optimized'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right/Lower: Verification Checklist */}
                <div className="md:col-span-7 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#d4d4d8] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {isRtl ? 'چک‌لیست داده‌های وارد شده' : 'Filled Values Checklist'}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-[#16271c] px-2 py-0.5 rounded border border-emerald-500/20">
                      {isRtl ? 'سینک با رزومه کاندید' : 'Candidate Synced'}
                    </span>
                  </div>

                  <div className="rounded-xl border border-[#242424] bg-[#141414] p-2.5 max-h-[340px] overflow-y-auto flex flex-col gap-1.5">
                    {activeApp.reviewChecklist.length > 0 ? (
                      activeApp.reviewChecklist.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-3 p-2 rounded-lg bg-[#1a1a1a] border border-[#262626] text-xs hover:border-[#383838] transition-colors"
                        >
                          <div className="flex items-start gap-2 min-w-0">
                            {item.status === 'ok' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            ) : item.status === 'warning' ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0">
                              <span className="font-medium text-[#e4e4e7] block truncate text-[11px]">{item.label}</span>
                              <span className="text-[11px] text-[#a1a1aa] font-mono truncate block">{item.value}</span>
                            </div>
                          </div>

                          <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-mono bg-[#222222] text-[#a1a1aa] border border-[#2e2e2e] shrink-0">
                            {item.category}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-[#52525b] text-xs flex flex-col items-center">
                        <Play className="w-6 h-6 text-[#444444] mb-2" />
                        <span>
                          {isRtl ? 'دکمه «تکمیل خودکار فرم» را بزنید تا چک‌لیست استخراج گردد' : 'Click "Start Automated Filling" to generate checklist'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#242424] mt-1">
                <div className="text-xs text-[#a1a1aa] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {activeApp.status === 'submitted'
                      ? isRtl
                        ? 'درخواست شما با موفقیت ثبت شد و در سیستم ذخیره گردید.'
                        : 'Application confirmed and recorded in local system.'
                      : isRtl
                      ? 'فرم تکمیل شده؛ با کلیک دکمه زیر، درخواست نهایی ارسال می‌شود.'
                      : 'Form filled and verified; click to submit final application.'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  {activeApp.status === 'queued' ? (
                    <button
                      onClick={() => executeApplication(activeApp.id)}
                      disabled={isExecuting}
                      className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5" />
                      {isRtl ? 'شروع فرآیند تکمیل فرم (Playwright)' : 'Start Automated Filling'}
                    </button>
                  ) : activeApp.status === 'needs_review' ? (
                    <button
                      onClick={() => submitReviewed(activeApp.id)}
                      disabled={isExecuting}
                      className="w-full sm:w-auto px-6 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isRtl ? 'تأیید و ارسال نهایی فرم' : 'Approve & Submit Application'}
                    </button>
                  ) : activeApp.status === 'submitted' ? (
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#182a20] text-emerald-300 border border-emerald-500/30 text-xs font-semibold font-mono">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-5xl w-full bg-[#181818] border border-[#2f2f2f] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-[#242424]">
              <span className="text-xs font-semibold text-[#f4f4f5]">
                {isRtl ? 'اسکرین‌شات تأییدیه گام نهایی در مرورگر' : 'Final Step Browser Screenshot'}
              </span>
              <button
                onClick={() => setPreviewModalImg(null)}
                className="p-1 rounded-lg text-[#71717a] hover:text-white hover:bg-[#252525] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-[#111111] flex items-center justify-center">
              <img src={previewModalImg} alt="Expanded snapshot" className="max-w-full rounded-lg border border-[#282828]" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
