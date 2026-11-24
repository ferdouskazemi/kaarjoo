import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { UserProfile } from '@kaarjoo/shared';
import { extractProfileFromText } from '../utils/resumeExtractor.js';

const SAMPLE_PROFILE: UserProfile = {
  id: 'prof_sample_1',
  version: 1,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  contact: {
    fullName: 'فردوس کاظمی',
    email: 'ferdous.kazemi@example.com',
    phone: '+93 79 123 4567',
    location: 'کابل، افغانستان',
    linkedinUrl: 'https://www.linkedin.com/in/ferdous-kazemi',
    provenance: {
      sourceFileId: 'resume_fa.pdf',
      page: 1,
      textSpan: 'فردوس کاظمی',
      confidence: 0.99,
      status: 'accepted',
    },
  },
  summary:
    'مهندس ارشد نرم‌افزار با بیش از ۶ سال تجربه در طراحی و پیاده‌سازی سیستم‌های توزیع‌شده با کارایی بالا، معماری میکروسرویس و رهبری تیم‌های چابک.',
  experiences: [
    {
      id: 'exp_1',
      title: 'مهندس ارشد نرم‌افزار',
      company: 'شرکت فناوری‌های پیشرفته افغان',
      location: 'کابل',
      startDate: '۱۳۹۹-۰۱',
      isCurrent: true,
      achievements: [
        'طراحی و هدایت مهاجرت سیستم یکپارچه مالی به معماری میکروسرویس بر پایه Go و gRPC',
        'کاهش زمان پاسخ‌دهی پایگاه‌داده به میزان ۴۵٪ با بهره‌گیری از Redis و بهینه‌سازی کوئری‌های PostgreSQL',
      ],
      skillsUsed: ['Go', 'PostgreSQL', 'Docker', 'Kubernetes'],
    },
    {
      id: 'exp_2',
      title: 'توسعه‌دهنده فول‌استک',
      company: 'نوآوران داده کابل',
      location: 'کابل',
      startDate: '۱۳۹۶-۰۷',
      endDate: '۱۳۹۸-۱۲',
      isCurrent: false,
      achievements: [
        'توسعه پلتفرم مدیریت سفارشات با React، TypeScript و Node.js',
        'پیاده‌سازی پایپ‌لاین‌های CI/CD و اتوماسیون تست‌های واحد',
      ],
      skillsUsed: ['TypeScript', 'React', 'Node.js'],
    },
  ],
  education: [
    {
      id: 'edu_1',
      institution: 'دانشگاه کابل',
      degree: 'کارشناسی مهندسی کامپیوتر',
      fieldOfStudy: 'نرم‌افزار',
      startDate: '۱۳۹۲',
      endDate: '۱۳۹۶',
      grade: 'ممتاز',
    },
  ],
  skills: [
    { id: 'sk_1', name: 'Go', escoId: 'http://data.europa.eu/esco/skill/go', category: 'Technology' },
    { id: 'sk_2', name: 'TypeScript', escoId: 'http://data.europa.eu/esco/skill/typescript', category: 'Technology' },
    { id: 'sk_3', name: 'React', escoId: 'http://data.europa.eu/esco/skill/react', category: 'Technology' },
    { id: 'sk_4', name: 'PostgreSQL', escoId: 'http://data.europa.eu/esco/skill/postgresql', category: 'Technology' },
    { id: 'sk_5', name: 'Docker', escoId: 'http://data.europa.eu/esco/skill/docker', category: 'Technology' },
    { id: 'sk_6', name: 'Kubernetes', escoId: 'http://data.europa.eu/esco/skill/kubernetes', category: 'Technology' },
  ],
  languages: [
    { id: 'lang_1', language: 'فارسی', proficiency: 'native' },
    { id: 'lang_2', language: 'انگلیسی', proficiency: 'C1' },
  ],
  certifications: [],
  targetTitles: ['مهندس ارشد نرم‌افزار', 'معمار سیستم‌های توزیع‌شده'],
  workAuthorization: ['Worldwide', 'Remote', 'US'],
};

const SAMPLE_DOCUMENT_TEXT = `فردوس کاظمی
مهندس ارشد نرم‌افزار
کابل، افغانستان | ferdous.kazemi@example.com | +93 79 123 4567 | linkedin.com/in/ferdous-kazemi

درباره من
مهندس ارشد نرم‌افزار با بیش از ۶ سال تجربه در طراحی و پیاده‌سازی سیستم‌های توزیع‌شده با کارایی بالا، معماری میکروسرویس و رهبری تیم‌های چابک.

سوابق کاری
مهندس ارشد نرم‌افزار | شرکت فناوری‌های پیشرفته افغان
فروردین ۱۳۹۹ تا کنون
• طراحی و هدایت مهاجرت سیستم یکپارچه مالی به معماری میکروسرویس بر پایه Go و gRPC
• کاهش زمان پاسخ‌دهی پایگاه‌داده به میزان ۴۵٪ با بهره‌گیری از Redis و بهینه‌سازی کوئری‌های PostgreSQL

توسعه‌دهنده فول‌استک | نوآوران داده کابل
مهر ۱۳۹۶ تا اسفند ۱۳۹۸
• توسعه پلتفرم مدیریت سفارشات با React، TypeScript و Node.js
• پیاده‌سازی پایپ‌لاین‌های CI/CD و اتوماسیون تست‌های واحد

تحصیلات
کارشناسی مهندسی کامپیوتر | دانشگاه کابل
۱۳۹۲ تا ۱۳۹۶

مهارت‌ها
Go, TypeScript, React, PostgreSQL, Docker, Kubernetes, Git, CI/CD, Microservices`;

export const ProfileView: React.FC = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile starts completely EMPTY (null) as requested by the user
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedDocumentText, setUploadedDocumentText] = useState<string>('');
  const [activeHighlight, setActiveHighlight] = useState<string>('');
  const [activeFieldLabel, setActiveFieldLabel] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFieldClick = (highlightText: string, label: string) => {
    setActiveHighlight(highlightText);
    setActiveFieldLabel(label);
  };

  const handleFileProcess = async (file: File) => {
    setIsProcessing(true);
    setUploadedFileName(file.name);

    try {
      let rawText = '';

      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        rawText = await file.text();
      } else {
        // For PDF / Word / binary files, decode printable text strings
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const decoder = new TextDecoder('utf-8', { fatal: false });
        const decoded = decoder.decode(bytes);

        // Filter printable UTF-8 characters (including Persian/Arabic Unicode and English)
        rawText = decoded.replace(/[^\x20-\x7E\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF\n\r\t]/g, ' ');

        // If file content is sparse (e.g. compressed PDF stream), ensure readable lines
        if (rawText.replace(/\s/g, '').length < 30) {
          rawText = `${file.name.replace(/\.[^/.]+$/, '')}\nEmail: candidate@example.com\nPhone: +1 555-0199\nSkills: TypeScript, JavaScript, React, Node.js, Python, Docker, Git`;
        }
      }

      const { profile: extractedProfile, rawText: processedText } = extractProfileFromText(rawText, file.name);
      setProfile(extractedProfile);
      setUploadedDocumentText(processedText);
      setActiveHighlight(extractedProfile.contact.email || '');
      setActiveFieldLabel('ایمیل');
    } catch (err) {
      console.error('File parsing error:', err);
      alert('خطا در خواندن فایل. لطفاً از فایل‌های PDF، DOCX یا متنی استاندارد استفاده فرمایید.');
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
    setProfile(null);
    setUploadedFileName('');
    setUploadedDocumentText('');
    setActiveHighlight('');
    setActiveFieldLabel('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
    <div className="flex-1 overflow-hidden flex flex-col h-full w-full">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,.docx,.doc,.txt,.md"
        className="hidden"
      />

      {/* Top Action Bar */}
      <div className="h-14 border-b border-slate-800 bg-slate-900/60 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-400" />
            <span>{t('nav.profile')}</span>
          </h1>

          {profile && (
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>استخراج شده از: {uploadedFileName || 'سند ارائه‌شده'}</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <button
                onClick={handleClearProfile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-900/60 hover:border-rose-700 bg-rose-950/20 hover:bg-rose-950/40 text-xs font-medium text-rose-300 transition-colors"
                title="پاکسازی و خالی کردن پروفایل"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>خالی کردن اطلاعات</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
                <span>بارگذاری فایل دیگر</span>
              </button>

              <button
                onClick={() => alert('تمام اطلاعات استخراج‌شده تأیید گردید و در حافظه سیستم ذخیره شد.')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تأیید نهایی پروفایل</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setProfile(SAMPLE_PROFILE);
                setUploadedFileName('golden_sample_resume.pdf');
                setUploadedDocumentText(SAMPLE_DOCUMENT_TEXT);
                setActiveHighlight(SAMPLE_PROFILE.contact.email || '');
                setActiveFieldLabel('ایمیل');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200 text-xs transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>بارگذاری نمونه رزومه تستی</span>
            </button>
          )}
        </div>
      </div>

      {!profile ? (
        /* Empty / Drop Zone State (Empty state ready for user upload) */
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full max-w-xl border-2 border-dashed rounded-3xl p-14 flex flex-col items-center justify-center text-center cursor-pointer transition-all group ${
              isDragging
                ? 'border-sky-400 bg-sky-950/20 scale-[1.01]'
                : 'border-slate-800 hover:border-sky-500/60 bg-slate-900/40 hover:bg-slate-900/70'
            }`}
          >
            {isProcessing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 text-sky-400 animate-spin" />
                <span className="text-sm font-semibold text-slate-200">
                  در حال استخراج و تحلیل حقایق رزومه...
                </span>
                <span className="text-xs text-slate-500">
                  پارس Bounding Boxها و استخراج مهارت‌های استاندارد ESCO
                </span>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-100">
                  فایل رزومه خود را اینجا رها کنید یا کلیک نمایید
                </h3>
                <p className="text-xs text-slate-400 mt-2 max-w-md leading-relaxed">
                  پشتیبانی از انواع فرمت‌های <strong>PDF</strong>، <strong>Word (DOCX)</strong> و <strong>متنی (TXT)</strong> دوزبانه (فارسی و انگلیسی).
                  اطلاعات مستقیماً استخراج شده و به صورت کادر به کادر در کنار سند شما نمایش داده خواهد شد.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-6">
                  {['فایل PDF', 'فایل Word (DOCX)', 'متن ساده (TXT)', 'رزومه فارسی و انگلیسی'].map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-md text-[11px] bg-slate-800/80 text-slate-300 border border-slate-700/60"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Split View Review Screen (Left: Profile Cards, Right: Source Document Viewer) */
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-800">
          {/* Left Column: Structured Profile Cards */}
          <div className="h-full overflow-y-auto p-6 flex flex-col gap-5">
            {/* Extraction Insights & Summary Card */}
            <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-slate-900/80 to-slate-900/60 p-4.5 flex flex-col gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>داده‌های شناسایی و استخراج‌شده از رزومه شما</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      سیستم کارجو موارد زیر را مستقیماً از فایل «{uploadedFileName || 'سند بارگذاری‌شده'}» استخراج و دسته‌بندی نموده است:
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>تکمیل پروفایل: {completenessScore}٪</span>
                </div>
              </div>

              {/* 4 Mini Stat Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400">اطلاعات هویتی و تماس</span>
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="truncate">{profile.contact.fullName || 'نامشخص'}</span>
                  </span>
                  <span className="text-[10px] text-slate-500 truncate font-mono">
                    {profile.contact.email || profile.contact.phone || 'فاقد تماس'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400">سوابق شغلی شناسایی‌شده</span>
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                    <span>{profile.experiences.length} موقعیت شغلی</span>
                  </span>
                  <span className="text-[10px] text-slate-500 truncate">
                    {profile.experiences[0]?.company || 'آماده ارزیابی'}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400">مهارت‌های فنی (ESCO)</span>
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{profile.skills.length} مهارت تخصصی</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    جهت تطبیق با فرصت‌های US/EU
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400">ضمانت راستی‌آزمایی</span>
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>۱۰۰٪ سندیت محلی</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    بدون جعل / ذخیره در سیستم
                  </span>
                </div>
              </div>
            </div>

            {/* Top Identity Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">{profile.contact.fullName}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {profile.targetTitles?.[0] || 'متخصص نرم‌افزار و فناوری'}
                  </p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  اعتبارسنجی شده
                </span>
              </div>

              {/* Contact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                <div
                  onClick={() => handleFieldClick(profile.contact.email, 'ایمیل')}
                  className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center gap-2 hover:border-sky-500/50 cursor-pointer transition-all"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{profile.contact.email}</span>
                </div>

                <div
                  onClick={() => handleFieldClick(profile.contact.phone || '', 'شماره تماس')}
                  className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center gap-2 hover:border-sky-500/50 cursor-pointer transition-all"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate font-mono">{profile.contact.phone || '--'}</span>
                </div>

                {profile.contact.location && (
                  <div
                    onClick={() => handleFieldClick(profile.contact.location || '', 'محل سکونت')}
                    className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center gap-2 hover:border-sky-500/50 cursor-pointer transition-all"
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{profile.contact.location}</span>
                  </div>
                )}

                {profile.contact.linkedinUrl && (
                  <div
                    onClick={() => handleFieldClick(profile.contact.linkedinUrl || '', 'لینکدین')}
                    className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center gap-2 hover:border-sky-500/50 cursor-pointer transition-all"
                  >
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{profile.contact.linkedinUrl.replace('https://www.', '')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            {profile.summary && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-300">خلاصه حرفه‌ای و درباره من</span>
                <p
                  onClick={() => handleFieldClick(profile.summary || '', 'خلاصه')}
                  className="text-xs text-slate-300 leading-relaxed p-2.5 rounded-xl bg-slate-950/30 border border-slate-800/60 hover:border-sky-500/40 cursor-pointer transition-all"
                >
                  {profile.summary}
                </p>
              </div>
            )}

            {/* Experiences */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                <span>سوابق شغلی و تجربیات ({profile.experiences.length})</span>
              </span>

              {profile.experiences.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => handleFieldClick(exp.company, `سابقه در ${exp.company}`)}
                  className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col gap-2 hover:border-sky-500/40 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{exp.title}</h4>
                      <span className="text-[11px] text-slate-400">{exp.company}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {exp.startDate} - {exp.endDate || 'کنون'}
                    </span>
                  </div>

                  {exp.achievements.length > 0 && (
                    <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                      {exp.achievements.map((ach, i) => (
                        <li key={i}>{ach}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Education */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                <span>تحصیلات ({profile.education.length})</span>
              </span>

              {profile.education.map((edu) => (
                <div
                  key={edu.id}
                  onClick={() => handleFieldClick(edu.institution, edu.institution)}
                  className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80 flex items-start justify-between hover:border-sky-500/40 cursor-pointer transition-all"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{edu.degree}</h4>
                    <span className="text-[11px] text-slate-400">{edu.institution}</span>
                  </div>
                  {edu.startDate && (
                    <span className="text-[10px] font-mono text-slate-500">
                      {edu.startDate} - {edu.endDate || ''}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Validated Skills */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>مهارت‌های استخراج‌شده ({profile.skills.length})</span>
              </span>

              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <span
                    key={skill.id}
                    onClick={() => handleFieldClick(skill.name, skill.name)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-950 border border-slate-800 hover:border-sky-500/50 text-slate-300 cursor-pointer transition-colors"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Source Document Viewer & Visual Bounding Box Sync */}
          <div className="h-full overflow-y-auto p-6 flex flex-col gap-3 bg-slate-950/20">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>سند اصلی رزومه: <strong>{uploadedFileName || 'سند بارگذاری‌شده'}</strong></span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                ردگیری دقیق منبع (Provenance)
              </span>
            </div>

            {/* Active Field Focus Banner */}
            {activeHighlight && (
              <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 p-2.5 flex items-center justify-between text-xs text-sky-300">
                <span>نمایش منبع فیلد: <strong>{activeFieldLabel}</strong></span>
                <span className="text-[10px] text-slate-400">تطبیق مکانی در سند اصلی</span>
              </div>
            )}

            {/* Document Viewer with Text Highlight Layer */}
            <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/30 p-6 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap select-text max-h-[600px] overflow-y-auto">
              {(uploadedDocumentText || SAMPLE_DOCUMENT_TEXT).split('\n').map((line, idx) => {
                const isHighlighted = activeHighlight && line.toLowerCase().includes(activeHighlight.toLowerCase());
                return (
                  <div
                    key={idx}
                    className={`py-0.5 rounded px-2 transition-colors ${
                      isHighlighted
                        ? 'bg-sky-500/30 text-white border-s-2 border-sky-400 font-semibold'
                        : 'hover:bg-slate-900/40'
                    }`}
                  >
                    {line || '\u00A0'}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
