import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UploadCloud,
  CheckCircle2,
  FileText,
  Briefcase,
  GraduationCap,
  Sparkles,
  Phone,
  Mail,
  Globe,
  MapPin,
  ShieldCheck,
  Trash2,
  Loader2,
  RefreshCw,
  CheckCheck,
  Lock,
  BarChart3,
  Copy,
  Check,
  Code2,
} from 'lucide-react';
import { parseDocumentFile } from '../utils/documentParser.js';
import { extractProfileFromText } from '../utils/resumeExtractor.js';
import { useProfileStore, INITIAL_CANDIDATE_PROFILE } from '../stores/profileStore.js';
import { useApplicationStore } from '../stores/applicationStore.js';

export const ProfileView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    profile,
    uploadedFileName,
    uploadedDocumentText,
    documentMeta,
    activeHighlight,
    activeFieldLabel,
    setProfile,
    setUploadedDocument,
    setActiveHighlight,
    clearProfile,
  } = useProfileStore();

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmToast, setConfirmToast] = useState(false);

  const handleFieldClick = (highlightText: string, label: string) => {
    setActiveHighlight(highlightText, label);
  };

  const handleFileProcess = async (file: File) => {
    setIsProcessing(true);
    try {
      // 1. Engineering-grade document parsing (PDF via PDF.js, Word via Mammoth, TXT/MD)
      const parseResult = await parseDocumentFile(file);

      // 2. Structured profile extraction
      const { profile: extractedProfile, rawText: processedText } = extractProfileFromText(
        parseResult.text,
        file.name
      );

      setUploadedDocument({
        fileName: file.name,
        text: processedText,
        meta: { pageCount: parseResult.pageCount, fileType: parseResult.fileType },
      });
      setProfile(extractedProfile);
      setActiveHighlight(extractedProfile.contact.email || extractedProfile.contact.fullName || '', 'Email');

      // 3. Immediately synchronize all application forms and queue checklists with the user's real email & details
      useApplicationStore.getState().syncWithProfile(extractedProfile);
    } catch (err) {
      console.error('File parsing error:', err);
      alert(
        isRtl
          ? 'خطا در خواندن و تحلیل فایل. لطفاً از فایل‌های استاندارد PDF، DOCX یا متنی استفاده فرمایید.'
          : 'Error parsing document. Please use standard PDF, DOCX, or text files.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleClearProfile = () => {
    clearProfile();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmProfile = () => {
    if (profile) {
      useApplicationStore.getState().syncWithProfile(profile);
      setConfirmToast(true);
      setTimeout(() => setConfirmToast(false), 3500);
    }
  };

  const handleCopyText = () => {
    if (uploadedDocumentText) {
      navigator.clipboard.writeText(uploadedDocumentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const completenessScore = profile
    ? Math.min(
        100,
        Math.round(
          (profile.contact.fullName ? 20 : 0) +
          (profile.contact.email ? 20 : 0) +
          (profile.contact.phone ? 10 : 0) +
          (profile.summary ? 15 : 0) +
          (profile.experiences.length > 0 ? 15 : 0) +
          (profile.education.length > 0 ? 10 : 0) +
          (profile.skills.length > 0 ? 10 : 0)
        )
      )
    : 0;

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full w-full bg-[#111111] text-[#f4f4f5]">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,.docx,.doc,.txt,.md"
        className="hidden"
      />

      {/* Confirmation Toast (Flash-Rive micro-interaction) */}
      {confirmToast && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#1c2e24] border border-emerald-500/40 text-emerald-300 text-xs shadow-2xl active-ring backdrop-blur transition-all">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>
            {isRtl
              ? 'تمام داده‌های استخراج‌شده تأیید و در صف ارسال و تمام فرم‌های ATS سینک شدند.'
              : 'Candidate profile verified and synchronized across all queued ATS applications.'}
          </span>
        </div>
      )}

      {/* Top Action Bar (Obsidian Dock Style) */}
      <div className="h-12 border-b border-[#282828] bg-[#161616] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xs font-semibold text-[#f4f4f5] flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>{t('profile.title')}</span>
          </h1>

          {profile && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#1d2720] border border-emerald-500/30 text-emerald-400 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span className="truncate max-w-[260px]">
                  {t('profile.extractedFrom')} {uploadedFileName || 'Ferdous Kazemi Resume.pdf'}
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <button
                onClick={handleClearProfile}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#382020] hover:border-rose-700/60 bg-[#221414] hover:bg-[#2b1717] text-[11px] font-medium text-rose-300 transition-colors cursor-pointer"
                title={t('profile.clear')}
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>{t('profile.clear')}</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#333333] hover:border-[#484848] bg-[#202020] hover:bg-[#262626] text-[11px] font-medium text-[#d4d4d8] hover:text-white transition-colors cursor-pointer"
              >
                <UploadCloud className="w-3 h-3 text-sky-400" />
                <span>{t('profile.uploadAnother')}</span>
              </button>

              <button
                onClick={handleConfirmProfile}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-[11px] transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>{t('profile.confirm')}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setProfile(INITIAL_CANDIDATE_PROFILE);
                useApplicationStore.getState().syncWithProfile(INITIAL_CANDIDATE_PROFILE);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#333333] hover:border-[#484848] bg-[#202020] text-[#a1a1aa] hover:text-white text-[11px] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-sky-400" />
              <span>{t('profile.loadSample')}</span>
            </button>
          )}
        </div>
      </div>

      {!profile ? (
        /* Empty / Drop Zone State (Clean minimal Obsidian drop zone) */
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full max-w-xl p-10 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center text-center cursor-pointer group ${
              isDragging
                ? 'border-sky-500 bg-[#16222f]'
                : 'border-[#2d2d2d] hover:border-sky-500/50 bg-[#161616] hover:bg-[#1a1a1a]'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-[#202020] border border-[#2e2e2e] flex items-center justify-center text-sky-400 mb-4 group-hover:scale-105 transition-transform">
              {isProcessing ? (
                <Loader2 className="w-7 h-7 animate-spin text-sky-400" />
              ) : (
                <UploadCloud className="w-7 h-7 text-sky-400" />
              )}
            </div>

            <h3 className="text-sm font-semibold text-[#f4f4f5] mb-1">
              {isProcessing
                ? isRtl
                  ? 'در حال خواندن و استخراج محلی اطلاعات با بالاترین دقت مهندسی...'
                  : 'Parsing and structuring resume locally with engineering precision...'
                : t('profile.dropTitle')}
            </h3>
            <p className="text-xs text-[#a1a1aa] max-w-sm mb-4 leading-relaxed">
              {t('profile.dropDesc')}
              <br />
              <span className="text-[11px] text-[#71717a] font-mono">
                {t('profile.supportedFormats')}
              </span>
            </p>

            <div className="flex items-center gap-2 text-[11px] font-mono text-[#a1a1aa] bg-[#202020] px-3 py-1.5 rounded-lg border border-[#2b2b2b]">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('profile.localNotice')}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Split View Review Screen (Left: Clean Extracted Cards, Right: Clean Raw Text Inspector) */
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-[#242424]">
          {/* Left Column: Structured Profile Cards */}
          <div className="h-full overflow-y-auto p-5 flex flex-col gap-4">
            {/* Extraction Insights & Summary Card */}
            <div className="rounded-xl border border-[#2d3748] bg-gradient-to-br from-[#131d27] via-[#161b22] to-[#141414] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-[#f4f4f5] flex items-center gap-1.5">
                      <span>{t('profile.insightsTitle')}</span>
                    </h3>
                    <p className="text-[11px] text-[#a1a1aa] mt-0.5">
                      {t('profile.insightsDesc')} «{uploadedFileName || 'Ferdous Kazemi Resume.pdf'}»
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#182a20] border border-emerald-500/30 text-[11px] font-medium text-emerald-400 shrink-0 font-mono">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{t('profile.completion')} {completenessScore}%</span>
                </div>
              </div>

              {/* 4 Mini Stat Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-[#181818] border border-[#262626] flex flex-col gap-0.5">
                  <span className="text-[10px] text-[#71717a]">{t('profile.identity')}</span>
                  <span className="text-[11px] font-semibold text-[#e4e4e7] flex items-center gap-1 truncate">
                    <CheckCheck className="w-3 h-3 text-emerald-400" />
                    <span className="truncate">{profile.contact.fullName || 'Unknown'}</span>
                  </span>
                  <span className="text-[10px] text-[#a1a1aa] truncate font-mono">
                    {profile.contact.email}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-[#181818] border border-[#262626] flex flex-col gap-0.5">
                  <span className="text-[10px] text-[#71717a]">{t('profile.experience')}</span>
                  <span className="text-[11px] font-semibold text-[#e4e4e7] flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-sky-400" />
                    <span>{profile.experiences.length} roles</span>
                  </span>
                  <span className="text-[10px] text-[#a1a1aa] truncate">
                    {profile.experiences[0]?.company || 'Active'}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-[#181818] border border-[#262626] flex flex-col gap-0.5">
                  <span className="text-[10px] text-[#71717a]">{t('profile.skills')}</span>
                  <span className="text-[11px] font-semibold text-[#e4e4e7] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{profile.skills.length} skills</span>
                  </span>
                  <span className="text-[10px] text-[#a1a1aa] font-mono">
                    Live ATS Match
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-[#181818] border border-[#262626] flex flex-col gap-0.5">
                  <span className="text-[10px] text-[#71717a]">{t('profile.provenanceGuarantee')}</span>
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    <span>100% Offline</span>
                  </span>
                  <span className="text-[10px] text-[#a1a1aa]">
                    Zero Data Leak
                  </span>
                </div>
              </div>
            </div>

            {/* Top Identity Card */}
            <div className="rounded-xl border border-[#282828] bg-[#1a1a1a] p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#f4f4f5]">{profile.contact.fullName}</h2>
                  <p className="text-xs text-[#a1a1aa] mt-0.5 font-mono">
                    {profile.targetTitles?.[0] || 'Senior / Mid-Level Software Engineer'}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-[#1b2b21] text-emerald-400 border border-emerald-500/20">
                  {isRtl ? 'اعتبارسنجی شده' : 'VERIFIED'}
                </span>
              </div>

              {/* Contact Grid with Precision Click-to-highlight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#d4d4d8]">
                <div
                  onClick={() => handleFieldClick(profile.contact.email, isRtl ? 'ایمیل' : 'Email')}
                  className="p-2 rounded-lg bg-[#141414] border border-[#262626] hover:border-sky-500/50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate font-mono text-[11px] text-[#e4e4e7]">{profile.contact.email}</span>
                </div>

                <div
                  onClick={() => handleFieldClick(profile.contact.phone || '', isRtl ? 'شماره تماس' : 'Phone')}
                  className="p-2 rounded-lg bg-[#141414] border border-[#262626] hover:border-sky-500/50 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate font-mono text-[11px] text-[#e4e4e7]">{profile.contact.phone || '--'}</span>
                </div>

                {profile.contact.location && (
                  <div
                    onClick={() => handleFieldClick(profile.contact.location || '', isRtl ? 'محل سکونت' : 'Location')}
                    className="p-2 rounded-lg bg-[#141414] border border-[#262626] hover:border-sky-500/50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate text-[11px]">{profile.contact.location}</span>
                  </div>
                )}

                {profile.contact.linkedinUrl && (
                  <div
                    onClick={() => handleFieldClick(profile.contact.linkedinUrl || '', 'LinkedIn')}
                    className="p-2 rounded-lg bg-[#141414] border border-[#262626] hover:border-sky-500/50 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                    <span className="truncate font-mono text-[11px]">{profile.contact.linkedinUrl.replace('https://', '')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            {profile.summary && (
              <div className="rounded-xl border border-[#282828] bg-[#1a1a1a] p-3.5 flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-[#a1a1aa]">{t('profile.summary')}</span>
                <p
                  onClick={() => handleFieldClick(profile.summary || '', isRtl ? 'خلاصه' : 'Summary')}
                  className="text-xs text-[#d4d4d8] leading-relaxed p-2.5 rounded-lg bg-[#141414] border border-[#242424] hover:border-sky-500/40 cursor-pointer transition-colors"
                >
                  {profile.summary}
                </p>
              </div>
            )}

            {/* Experiences */}
            <div className="rounded-xl border border-[#282828] bg-[#1a1a1a] p-3.5 flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold text-[#a1a1aa] flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('profile.experience')} ({profile.experiences.length})</span>
              </span>

              {profile.experiences.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => handleFieldClick(exp.company, exp.company)}
                  className="p-3 rounded-lg bg-[#141414] border border-[#242424] flex flex-col gap-1.5 hover:border-sky-500/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#f4f4f5]">{exp.title}</h4>
                      <span className="text-[11px] text-sky-400">{exp.company}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#a1a1aa] bg-[#202020] px-2 py-0.5 rounded border border-[#2b2b2b]">
                      {exp.startDate} - {exp.endDate || (isRtl ? 'کنون' : 'Present')}
                    </span>
                  </div>

                  {exp.achievements.length > 0 && (
                    <ul className="text-[11px] text-[#a1a1aa] space-y-1 list-disc list-inside">
                      {exp.achievements.map((ach, i) => (
                        <li key={i}>{ach}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Education */}
            <div className="rounded-xl border border-[#282828] bg-[#1a1a1a] p-3.5 flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-[#a1a1aa] flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                <span>{t('profile.education')} ({profile.education.length})</span>
              </span>

              {profile.education.map((edu) => (
                <div
                  key={edu.id}
                  onClick={() => handleFieldClick(edu.institution, edu.institution)}
                  className="p-2.5 rounded-lg bg-[#141414] border border-[#242424] flex items-start justify-between hover:border-sky-500/40 cursor-pointer transition-colors"
                >
                  <div>
                    <h4 className="text-xs font-bold text-[#f4f4f5]">{edu.degree}</h4>
                    <span className="text-[11px] text-[#a1a1aa]">{edu.institution}</span>
                  </div>
                  {edu.startDate && (
                    <span className="text-[10px] font-mono text-[#71717a]">
                      {edu.startDate} - {edu.endDate || ''}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Validated Skills */}
            <div className="rounded-xl border border-[#282828] bg-[#1a1a1a] p-3.5 flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-[#a1a1aa] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('profile.skills')} ({profile.skills.length})</span>
              </span>

              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <span
                    key={skill.id}
                    onClick={() => handleFieldClick(skill.name, skill.name)}
                    className="px-2 py-0.5 rounded text-[11px] bg-[#141414] border border-[#2b2b2b] hover:border-sky-500/50 text-[#d4d4d8] font-mono cursor-pointer transition-colors"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Source Document Viewer (Obsidian Code Inspector Style) */}
          <div className="h-full overflow-hidden flex flex-col bg-[#141414]">
            {/* Inspector Header Bar */}
            <div className="h-10 px-4 border-b border-[#242424] bg-[#181818] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-medium text-[#e4e4e7] truncate max-w-[200px]">
                  {uploadedFileName || 'Resume Document Text'}
                </span>
                {documentMeta && (
                  <span className="text-[10px] font-mono text-[#a1a1aa] bg-[#222222] px-2 py-0.5 rounded border border-[#2f2f2f]">
                    {documentMeta.pageCount}P • {documentMeta.fileType.toUpperCase()}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyText}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#202020] hover:bg-[#282828] border border-[#303030] text-[10px] text-[#d4d4d8] transition-colors cursor-pointer"
                  title={t('profile.copyText')}
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? t('profile.copied') : t('profile.copyText')}</span>
                </button>
              </div>
            </div>

            {/* Active Field Focus Banner */}
            {activeHighlight && (
              <div className="px-4 py-2 bg-[#12222d] border-b border-sky-500/30 flex items-center justify-between text-[11px] text-sky-300">
                <span>
                  {t('profile.provenanceField')} <strong>{activeFieldLabel}</strong>
                </span>
                <span className="font-mono text-[10px] text-sky-400/80 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
                  {activeHighlight}
                </span>
              </div>
            )}

            {/* Document Viewer with Line Numbers and Precision Text Rendering */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed text-[#d4d4d8] select-text">
              {uploadedDocumentText ? (
                uploadedDocumentText.split('\n').map((line, idx) => {
                  const isHighlighted =
                    activeHighlight &&
                    line.toLowerCase().includes(activeHighlight.toLowerCase());

                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 py-0.5 px-2 rounded transition-colors ${
                        isHighlighted
                          ? 'bg-[#1a3344] text-white border-s-2 border-sky-400 font-semibold shadow-sm'
                          : 'hover:bg-[#1c1c1c]'
                      }`}
                    >
                      <span className="w-8 shrink-0 text-right select-none text-[10px] text-[#52525b] font-mono">
                        {idx + 1}
                      </span>
                      <span className="flex-1 whitespace-pre-wrap break-all">
                        {line || '\u00A0'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-[#52525b] text-xs">
                  {isRtl ? 'متن سندی برای نمایش بارگذاری نشده است.' : 'No document text loaded yet.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
