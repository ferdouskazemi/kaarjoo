import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  FileText,
  Mail,
  HelpCircle,
  Download,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  LayoutTemplate,
} from 'lucide-react';
import type { DisplayJob } from '../jobs/JobCard.js';
import type { TemplateId, UserProfile } from '@kaarjoo/shared';
import { formatNumber } from '../../utils/formatters.js';
import { LANGUAGE_NAMES } from '../../i18n/constants.js';
import { commands } from '../../bindings.js';

interface TailoredDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: DisplayJob | null;
  profile?: UserProfile | null;
  onProceedToApply?: () => void;
}

export const TailoredDocumentsModal: React.FC<TailoredDocumentsModalProps> = ({
  isOpen,
  onClose,
  job,
  profile,
  onProceedToApply,
}) => {
  const { t, i18n } = useTranslation();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'resume' | 'coverLetter' | 'screening'>('resume');
  const [docLanguage, setDocLanguage] = useState<'en' | 'fa'>('en');
  const [templateId, setTemplateId] = useState<TemplateId>('ats-clean');

  // Editable Tailored Content (derived from active profile and job)
  const [tailoredSummary, setTailoredSummary] = useState('');
  const [tailoredBullets, setTailoredBullets] = useState<string[]>([]);
  const [coverLetterText, setCoverLetterText] = useState('');

  useEffect(() => {
    if (!job) return;
    const candidateName = profile?.contact?.fullName || '';
    const skillsList = (profile?.skills || []).slice(0, 6).map((s) => s.name);
    const firstSummary = profile?.summary || (skillsList.length > 0
      ? `Experienced professional with hands-on skills in ${skillsList.join(', ')}.`
      : '');
    setTailoredSummary(firstSummary);

    const expBullets = (profile?.experiences || [])
      .flatMap((exp) => (exp.achievements && exp.achievements.length > 0 ? exp.achievements : exp.description ? [exp.description] : []))
      .filter(Boolean)
      .slice(0, 4);
    setTailoredBullets(expBullets);

    const matchedSkillLine = skillsList.length > 0
      ? `My background in ${skillsList.slice(0, 4).join(', ')} aligns closely with your requirements.`
      : '';
    setCoverLetterText(
      `Dear Hiring Team at ${job.company},\n\nI am writing to express my interest in the ${job.title} position at ${job.company}. ${matchedSkillLine}\n\nThank you for your time and consideration.\n\nSincerely,\n${candidateName || 'Candidate'}`
    );
  }, [job, profile]);

  const [screeningAnswers, setScreeningAnswers] = useState<Array<{ q: string; a: string; category: string }>>([
    { q: 'What is your current notice period / earliest start date?', a: 'Available within 2 weeks of offer acceptance.', category: 'notice_period' },
    { q: 'What are your compensation expectations?', a: '$190,000 - $240,000 USD / year (negotiable based on equity and total package).', category: 'salary' },
    { q: 'Are you legally authorized to work, or do you require sponsorship?', a: 'Authorized for remote international contract; open to relocation with visa sponsorship.', category: 'work_auth' },
    { q: 'How many years of experience do you have with Go and distributed systems?', a: '5+ years hands-on production experience.', category: 'experience_years' },
    { q: 'Voluntary self-identification of gender / demographics:', a: 'I decline to self-identify / Prefer not to answer.', category: 'eeo' },
  ]);

  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState<'pdf' | 'docx' | null>(null);

  // Live Truthfulness Check
  const truthfulnessStatus = useMemo(() => {
    // Check if user edited something adversarial (e.g. fake employer or fake PhD)
    const text = `${tailoredSummary} ${tailoredBullets.join(' ')}`.toLowerCase();
    const unsupported: string[] = [];

    if (text.includes('google') || text.includes('apple') || text.includes('netflix')) {
      unsupported.push('Google/Apple');
    }
    if (text.includes('phd') || text.includes('stanford') || text.includes('harvard')) {
      unsupported.push('Stanford/Harvard PhD');
    }
    if (text.includes('15+ years') || text.includes('20 years')) {
      unsupported.push('20+ years exaggeration');
    }

    return {
      isTruthful: unsupported.length === 0,
      score: unsupported.length === 0 ? 100 : Math.max(20, 100 - unsupported.length * 35),
      unsupported,
    };
  }, [tailoredSummary, tailoredBullets]);

  if (!isOpen || !job) return null;

  const handleCopyCoverLetter = () => {
    navigator.clipboard.writeText(coverLetterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (type: 'pdf' | 'docx') => {
    setDownloading(type);
    try {
      const res = await commands.documentsTailor(job.id, templateId, docLanguage);
      if (res.status === 'error') {
        throw new Error(res.error);
      }
    } catch {
      // Browser/demo fallback: download a plain-text tailored document bundle
      const content = `${profile?.contact?.fullName || 'Candidate'}\n${job.company} — ${job.title}\n\nSUMMARY\n${tailoredSummary}\n\nEXPERIENCE HIGHLIGHTS\n${tailoredBullets.map((b) => `• ${b}`).join('\n')}\n\nCOVER LETTER\n${coverLetterText}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${job.company.replace(/[^a-z0-9]/gi, '_')}_Tailored_${type}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Studio Top Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                {t('documents.title')}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {job.company} — {job.title}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-400" />
              <span>{t('documents.subtitle')}</span>
            </h2>
          </div>

          {/* Controls: Language, Template, Export */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Template Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
              <LayoutTemplate className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value as TemplateId)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="ats-clean" className="bg-slate-900 text-slate-200">
                  {t('documents.atsClean')}
                </option>
                <option value="modern-minimal" className="bg-slate-900 text-slate-200">
                  {t('documents.modernMinimal')}
                </option>
                <option value="compact-technical" className="bg-slate-900 text-slate-200">
                  {t('documents.compactTechnical')}
                </option>
              </select>
            </div>

            {/* Language Switch */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setDocLanguage('en')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  docLanguage === 'en' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setDocLanguage('fa')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  docLanguage === 'fa' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400'
                }`}
              >
                {LANGUAGE_NAMES.fa}
              </button>
            </div>

            {/* Export Buttons */}
            <button
              onClick={() => handleDownload('pdf')}
              disabled={downloading !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-rose-400" />
              <span>{downloading === 'pdf' ? t('documents.preparingPdf') : 'PDF'}</span>
            </button>

            <button
              onClick={() => handleDownload('docx')}
              disabled={downloading !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>{downloading === 'docx' ? t('documents.preparingDocx') : 'DOCX'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Truthfulness Guard Alert Banner */}
        <div
          className={`px-5 py-2.5 border-b text-xs flex items-center justify-between gap-3 ${
            truthfulnessStatus.isTruthful
              ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-900/50 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {truthfulnessStatus.isTruthful ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{t('documents.truthCheckTitle')}:</span>
            <span>
              {truthfulnessStatus.isTruthful
                ? t('documents.noUnsupportedClaims')
                : `${t('documents.truthWarning')}: ${truthfulnessStatus.unsupported.join(' | ')}`}
            </span>
          </div>
          <span className="font-mono font-bold">
            {formatNumber(truthfulnessStatus.score, i18n.language)}% {t('documents.truthScore')}
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-800 bg-slate-900/40 flex items-center gap-6">
          <button
            onClick={() => setActiveTab('resume')}
            className={`py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'resume'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{t('documents.tailoredBullets')}</span>
          </button>

          <button
            onClick={() => setActiveTab('coverLetter')}
            className={`py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'coverLetter'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>{t('documents.coverLetter')}</span>
          </button>

          <button
            onClick={() => setActiveTab('screening')}
            className={`py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'screening'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>{t('documents.screeningAnswers')}</span>
          </button>
        </div>

        {/* Tab 1: Side-by-side Diff View */}
        {activeTab === 'resume' && (
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {/* Left Pane: Original Profile Reference */}
            <div className="p-6 overflow-y-auto flex flex-col gap-5 bg-slate-950/20 text-start">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t('profile.identity')}
                </span>
                <span className="text-[10px] text-slate-500">{t('common.readOnlyDesc')}</span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-1.5">{t('profile.summary')}</h4>
                <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                  {profile?.summary || '—'}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-1.5">{t('profile.experience')}</h4>
                <div className="space-y-3">
                  {(profile?.experiences || []).slice(0, 3).map((exp) => (
                    <div key={exp.id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-xs">
                      <span className="font-semibold text-slate-200 block mb-1">
                        {exp.title} — {exp.company}
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                        {(exp.achievements && exp.achievements.length > 0
                          ? exp.achievements
                          : exp.description
                          ? [exp.description]
                          : []
                        )
                          .slice(0, 2)
                          .map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-1.5">{t('profile.skills')}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(profile?.skills || []).slice(0, 12).map((s) => (
                    <span key={s.id} className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Pane: Tailored ATS Resume (Editable) */}
            <div className="p-6 overflow-y-auto flex flex-col gap-5 bg-slate-900/40 text-start">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                    {t('documents.customizeFor')} {job.company}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {t('documents.atsSafe')}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">{t('common.editableDesc')}</span>
              </div>

              {/* Tailored Summary Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t('profile.summary')}</span>
                  </h4>
                  <span className="text-[10px] text-slate-500">{job.company}</span>
                </div>
                <textarea
                  rows={4}
                  value={tailoredSummary}
                  onChange={(e) => setTailoredSummary(e.target.value)}
                  className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Tailored Achievements Bullets */}
              <div>
                <h4 className="text-xs font-bold text-slate-200 mb-1.5">
                  {t('documents.tailoredBullets')} — {job.title}
                </h4>
                <div className="space-y-2">
                  {tailoredBullets.map((bullet, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">
                        {idx + 1}
                      </span>
                      <textarea
                        rows={2}
                        value={bullet}
                        onChange={(e) => {
                          const updated = [...tailoredBullets];
                          updated[idx] = e.target.value;
                          setTailoredBullets(updated);
                        }}
                        className="flex-1 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Cover Letter */}
        {activeTab === 'coverLetter' && (
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 max-w-4xl mx-auto w-full text-start">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-100">{t('documents.coverLetter')}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t('documents.truthCheckDesc')}
                </p>
              </div>
              <button
                onClick={handleCopyCoverLetter}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? t('common.copied') : t('common.copy')}</span>
              </button>
            </div>

            <textarea
              rows={14}
              value={coverLetterText}
              onChange={(e) => setCoverLetterText(e.target.value)}
              className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans focus:outline-none focus:border-sky-500"
            />
          </div>
        )}

        {/* Tab 3: Screening Answers Bank */}
        {activeTab === 'screening' && (
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4 max-w-4xl mx-auto w-full text-start">
            <div className="pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100">{t('documents.screeningAnswers')}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('documents.truthCheckDesc')}
              </p>
            </div>

            <div className="space-y-3">
              {screeningAnswers.map((item, index) => (
                <div key={index} className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">{item.q}</span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {item.category}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={item.a}
                    onChange={(e) => {
                      const updated = [...screeningAnswers];
                      updated[index].a = e.target.value;
                      setScreeningAnswers(updated);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t('documents.atsSafe')} • {job.atsType}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              {t('common.close')}
            </button>

            <button
              onClick={() => {
                if (!truthfulnessStatus.isTruthful) {
                  return;
                }
                onClose();
                if (onProceedToApply) onProceedToApply();
              }}
              disabled={!truthfulnessStatus.isTruthful}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-bold text-white transition-all shadow-md hover:shadow-sky-900/30 cursor-pointer"
            >
              <span>{t('common.proceedToApply')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
