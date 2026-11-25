import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Building2,
  MapPin,
  Calendar,
  Sparkles,
  FileText,
  CheckCircle2,
  Compass,
  ExternalLink,
  MessageSquare,
  Save,
} from 'lucide-react';
import { ApplicationRecord, ApplicationStatus } from '@kaarjoo/shared';
import { formatDateTime, formatNumber } from '../../utils/formatters.js';

interface ApplicationDetailDrawerProps {
  application: ApplicationRecord | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: ApplicationStatus) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onScheduleInterview: (id: string, date: string, note?: string) => void;
}

export const ApplicationDetailDrawer: React.FC<ApplicationDetailDrawerProps> = ({
  application,
  onClose,
  onUpdateStatus,
  onUpdateNotes,
  onScheduleInterview,
}) => {
  const { t, i18n } = useTranslation();

  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'screenshots' | 'notes'>('overview');
  const [localNotes, setLocalNotes] = useState(application?.notes || '');
  const [interviewDateInput, setInterviewDateInput] = useState(application?.interviewDate || '');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  if (!application) return null;

  const handleSaveNotes = () => {
    onUpdateNotes(application.id, localNotes);
    if (interviewDateInput && interviewDateInput !== application.interviewDate) {
      onScheduleInterview(application.id, interviewDateInput);
    }
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 2000);
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
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider ${colors[ats] || colors.generic}`}>
        {ats}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-950/40">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">{application.company}</span>
              <span className="text-slate-600">•</span>
              {getAtsBadge(application.atsType)}
              {application.matchScore && (
                <>
                  <span className="text-slate-600">•</span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                    <Sparkles className="w-3 h-3" />
                    {formatNumber(application.matchScore, i18n.language)}% {t('jobs.matchScore')}
                  </span>
                </>
              )}
            </div>

            <h2 className="text-lg font-bold text-slate-100 line-clamp-2 leading-snug">
              {application.jobTitle}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
              {application.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{application.location}</span>
                </span>
              )}
              {application.salaryText && (
                <span className="text-emerald-400 font-mono text-[11px]">
                  {application.salaryText}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={application.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={t('jobs.viewOriginal')}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              aria-label={t('common.close')}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Transition Ribbon */}
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-slate-400">{t('tracker.status')}:</span>
          <select
            value={application.status}
            onChange={(e) => onUpdateStatus(application.id, e.target.value as ApplicationStatus)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
          >
            <option value="saved">{t('tracker.statusSaved')}</option>
            <option value="needs_review">{t('tracker.statusNeedsReview')}</option>
            <option value="applied">{t('tracker.statusApplied')}</option>
            <option value="interview">{t('tracker.statusInterview')}</option>
            <option value="offer">{t('tracker.statusOffer')}</option>
            <option value="rejected">{t('tracker.statusRejected')}</option>
          </select>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 px-6 gap-6 bg-slate-900 text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 relative cursor-pointer ${
              activeTab === 'overview'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tracker.tabOverview')}
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 relative flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'timeline'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{t('tracker.timeline')}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-400 font-mono">
              {formatNumber(application.timeline?.length || 1, i18n.language)}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('screenshots')}
            className={`py-3 relative cursor-pointer ${
              activeTab === 'screenshots'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tracker.tabScreenshots')}
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-3 relative cursor-pointer ${
              activeTab === 'notes'
                ? 'text-sky-400 border-b-2 border-sky-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t('tracker.tabNotes')}
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* TAB 1: OVERVIEW & DOCUMENTS */}
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-5">
              {/* Documents Used Card */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col gap-3">
                <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  {t('tracker.docsUsed')}
                </span>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 text-xs">
                    <span className="text-slate-300 font-medium truncate">
                      {application.tailoredResumePath
                        ? application.tailoredResumePath.split(/[\\/]/).pop()
                        : t('documents.atsSafe')}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {t('documents.truthPassed')}
                    </span>
                  </div>

                  {application.coverLetterText && (
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-xs flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-slate-400">{t('documents.coverLetter')}:</span>
                      <p className="text-slate-300 leading-relaxed text-[11px] whitespace-pre-wrap font-sans">
                        {application.coverLetterText}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Job Posting Snapshot */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-sky-400" />
                    {t('tracker.jobSnapshot')}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {t('tracker.offlineBadge')}
                  </span>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {application.jobSnapshot?.descriptionMarkdown || (
                    <p className="text-slate-400 text-xs">
                      {application.jobTitle} - {application.company}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="flex flex-col gap-4">
              <span className="text-xs font-semibold text-slate-300">
                {t('tracker.timeline')}
              </span>

              <div className="relative ps-6 pe-6 border-s-2 border-slate-800 space-y-6 ms-3">
                {(application.timeline && application.timeline.length > 0
                  ? application.timeline
                  : [
                      {
                        id: 'tl_def',
                        status: application.status,
                        timestamp: application.createdAt,
                        title: 'saved',
                      },
                    ]
                ).map((event, idx) => {
                  const displayTitle = ['saved', 'queued', 'tailored', 'needs_review', 'applied', 'interview', 'offer', 'rejected'].includes(event.title)
                    ? t(`status.${event.title}`, event.title)
                    : event.title;

                  return (
                    <div key={event.id || idx} className="relative group">
                      <div className="absolute -start-[31px] top-0.5 w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-sky-400 group-hover:scale-125 transition-transform" />

                      <div className="flex flex-col gap-1 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-200">{displayTitle}</span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {formatDateTime(event.timestamp, i18n.language)}
                          </span>
                        </div>
                        {event.note && (
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{event.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SCREENSHOTS */}
          {activeTab === 'screenshots' && (
            <div className="flex flex-col gap-4">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-sky-400" />
                {t('tracker.tabScreenshots')}
              </span>

              {application.screenshotConfirmation || application.screenshotBeforeSubmit ? (
                <div className="flex flex-col gap-4">
                  {application.screenshotConfirmation && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-emerald-400">
                        {t('tracker.finalConfirmation')}
                      </span>
                      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950 aspect-video">
                        <img
                          src={application.screenshotConfirmation}
                          alt="Confirmation"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {application.screenshotBeforeSubmit && (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-amber-300">
                        {t('queue.finalStep')}
                      </span>
                      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950 aspect-video">
                        <img
                          src={application.screenshotBeforeSubmit}
                          alt="Review Step"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 text-xs rounded-xl border border-dashed border-slate-800">
                  {t('tracker.noScreenshots')}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: NOTES & REMINDERS */}
          {activeTab === 'notes' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  {t('tracker.scheduleInterview')}
                </label>
                <input
                  type="datetime-local"
                  value={interviewDateInput ? interviewDateInput.substring(0, 16) : ''}
                  onChange={(e) => setInterviewDateInput(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-sky-400" />
                  {t('tracker.addNote')}
                </label>
                <textarea
                  rows={6}
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder={t('tracker.notesPlaceholder')}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500 leading-relaxed font-sans"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {isSavedSuccess ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    {t('common.saved')}
                  </span>
                ) : <span />}

                <button
                  onClick={handleSaveNotes}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {t('tracker.saveNotes')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
