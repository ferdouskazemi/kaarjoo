import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Briefcase,
  GraduationCap,
  Sparkles,
  Phone,
  Mail,
  Globe,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { UserProfile } from '@kaarjoo/shared';

// Initial mock profile based on golden resume for rich immediate interaction
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
  },
  summary:
    'توسعه‌دهنده ارشد نرم‌افزار با بیش از ۶ سال سابقه در طراحی و پیاده‌سازی سامانه‌های توزیع‌شده مقیاس‌پذیر و اتوماسیون هوشمند.',
  targetTitles: ['مهندس ارشد نرم‌افزار', 'توسعه‌دهنده ارشد فول‌استک'],
  experiences: [
    {
      id: 'exp_1',
      title: 'توسعه‌دهنده ارشد فول‌استک',
      company: 'داده‌پردازان آریا',
      startDate: '1399',
      isCurrent: true,
      achievements: [
        'بازطراحی معماری میکروسرویس‌ها با بهره‌گیری از Node.js و Docker',
        'افزایش توان پردازش تراکنش‌ها تا ۳ برابر در سیستم پرداخت آنلاین',
        'رهبری تیم فنی ۴ نفره در فرایند مهاجرت داده‌ها',
      ],
      skillsUsed: ['Node.js', 'Docker', 'PostgreSQL'],
    },
    {
      id: 'exp_2',
      title: 'برنامه‌نویس وب',
      company: 'شرکت فناوری نوین',
      startDate: '1396',
      endDate: '1399',
      isCurrent: false,
      achievements: [
        'توسعه بیش از ۱۰ وب‌اپلیکیشن شرکتی با React و TypeScript',
        'پیاده‌سازی تست‌های واحد و یکپارچه‌سازی مستمر با Vitest',
      ],
      skillsUsed: ['React', 'TypeScript', 'Vitest'],
    },
  ],
  education: [
    {
      id: 'edu_1',
      institution: 'دانشگاه کابل',
      degree: 'کارشناسی',
      fieldOfStudy: 'مهندسی نرم‌افزار',
      startDate: '1392',
      endDate: '1396',
    },
  ],
  skills: [
    { id: 'sk_1', name: 'JavaScript', category: 'Programming Languages' },
    { id: 'sk_2', name: 'TypeScript', category: 'Programming Languages' },
    { id: 'sk_3', name: 'React', category: 'Frontend Frameworks' },
    { id: 'sk_4', name: 'Node.js', category: 'Backend Frameworks' },
    { id: 'sk_5', name: 'SQLite', category: 'Databases' },
    { id: 'sk_6', name: 'PostgreSQL', category: 'Databases' },
    { id: 'sk_7', name: 'Docker', category: 'DevOps & Tools' },
    { id: 'sk_8', name: 'Git', category: 'DevOps & Tools' },
  ],
  languages: [],
  certifications: [],
  workAuthorization: [],
};

const SAMPLE_DOCUMENT_TEXT = `فردوس کاظمی
مهندس ارشد نرم‌افزار
ایمیل: ferdous.kazemi@example.com
تلفن: +93 79 123 4567
لینکدین: https://www.linkedin.com/in/ferdous-kazemi
محل سکونت: کابل، افغانستان

درباره من
توسعه‌دهنده ارشد نرم‌افزار با بیش از ۶ سال سابقه در طراحی و پیاده‌سازی سامانه‌های توزیع‌شده مقیاس‌پذیر و اتوماسیون هوشمند.

سوابق شغلی
توسعه‌دهنده ارشد فول‌استک | داده‌پردازان آریا
۱۳۹۹ تا اکنون
• بازطراحی معماری میکروسرویس‌ها با بهره‌گیری از Node.js و Docker
• افزایش توان پردازش تراکنش‌ها تا ۳ برابر در سیستم پرداخت آنلاین
• رهبری تیم فنی ۴ نفره در فرایند مهاجرت داده‌ها

برنامه‌نویس وب | شرکت فناوری نوین
۱۳۹۶ تا ۱۳۹۹
• توسعه بیش از ۱۰ وب‌اپلیکیشن شرکتی با React و TypeScript
• پیاده‌سازی تست‌های واحد و یکپارچه‌سازی مستمر با Vitest

تحصیلات
کارشناسی مهندسی نرم‌افزار | دانشگاه کابل
۱۳۹۲ تا ۱۳۹۶

مهارت‌ها
JavaScript, TypeScript, React, Node.js, SQLite, PostgreSQL, Docker, Git`;

export const ProfileView: React.FC = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(SAMPLE_PROFILE);
  const [activeHighlight, setActiveHighlight] = useState<string>('ferdous.kazemi@example.com');
  const [activeFieldLabel, setActiveFieldLabel] = useState<string>('ایمیل');
  const [conflictResolved, setConflictResolved] = useState<boolean>(false);
  const [selectedPhone, setSelectedPhone] = useState<string>('+93 79 123 4567');

  const handleFieldClick = (highlightText: string, label: string) => {
    setActiveHighlight(highlightText);
    setActiveFieldLabel(label);
  };

  const handleAcceptAll = () => {
    // Confirm high confidence fields
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full w-full">
      {/* Top action bar */}
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
                <span>دقت استخراج: ۹۸٪ (اعتبارسنجی منبع)</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <button
                onClick={() => setProfile(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                بارگذاری مجدد
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-all shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تأیید فیلدهای با ضریب اطمینان بالا</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setProfile(SAMPLE_PROFILE)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-semibold text-xs"
            >
              <span>بارگذاری نمونه رزومه طلایی</span>
            </button>
          )}
        </div>
      </div>

      {!profile ? (
        /* Empty / Drop Zone State */
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
          <div
            onClick={() => setProfile(SAMPLE_PROFILE)}
            className="w-full max-w-xl border-2 border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl bg-slate-900/30 hover:bg-slate-900/60 p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
          >
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-200">
              فایل‌های رزومه خود را اینجا بکشید یا انتخاب کنید
            </h3>
            <p className="text-xs text-slate-400 mt-2 max-w-md leading-relaxed">
              پشتیبانی همزمان از چند فایل: PDF، Word (DOCX)، فایل‌های متنی و اسکن‌های تصویری.
              اطلاعات از اسناد اصلی استخراج و با دقت بالا تطبیق داده می‌شوند.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-6">
              {['PDF', 'DOCX', 'LinkedIn PDF', 'تصاویر اسکن‌شده'].map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-md text-[11px] bg-slate-800/80 text-slate-300 border border-slate-700/60">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Split View Review Screen */
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-slate-800">
          {/* Left Column: Structured Profile Cards */}
          <div className="h-full overflow-y-auto p-6 flex flex-col gap-5">
            {/* Multi-File Conflict Banner */}
            {!conflictResolved && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col gap-2.5 animate-in fade-in-0 duration-200">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>تضاد در شماره تماس شناسایی شد (دو شماره در اسناد ورودی یافت شد)</span>
                </div>
                <p className="text-xs text-slate-300">
                  لطفاً شماره تلفن اصلی خود را جهت درج در درخواست‌ها انتخاب فرمایید:
                </p>
                <div className="flex flex-wrap gap-3 mt-1">
                  {[
                    { number: '+93 79 123 4567', label: 'افغانستان (رزومه استاندارد)' },
                    { number: '+98 912 345 6789', label: 'ایران (پروفایل لینکدین)' },
                  ].map((opt) => (
                    <label
                      key={opt.number}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        selectedPhone === opt.number
                          ? 'border-sky-500 bg-sky-500/20 text-sky-200 font-semibold'
                          : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="phone_conflict"
                        checked={selectedPhone === opt.number}
                        onChange={() => {
                          setSelectedPhone(opt.number);
                          setConflictResolved(true);
                        }}
                        className="text-sky-500 focus:ring-0"
                      />
                      <span>{opt.number}</span>
                      <span className="text-[10px] text-slate-400">({opt.label})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <div>
                  <h2 className="text-lg font-bold text-slate-100">{profile.contact.fullName}</h2>
                  <span className="text-xs text-sky-400 font-medium">
                    {profile.targetTitles[0] || 'مهندس ارشد نرم‌افزار'}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  اطمینان: ۱۰۰٪
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <button
                  onClick={() => handleFieldClick(profile.contact.email, 'ایمیل')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 text-start transition-colors border border-slate-800/40"
                >
                  <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">{profile.contact.email}</span>
                </button>

                <button
                  onClick={() => handleFieldClick(selectedPhone, 'تلفن تماس')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 text-start transition-colors border border-slate-800/40"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{selectedPhone}</span>
                </button>

                {profile.contact.location && (
                  <button
                    onClick={() => handleFieldClick(profile.contact.location || '', 'محل سکونت')}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 text-start transition-colors border border-slate-800/40"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{profile.contact.location}</span>
                  </button>
                )}

                {profile.contact.linkedinUrl && (
                  <button
                    onClick={() => handleFieldClick(profile.contact.linkedinUrl || '', 'لینکدین')}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/60 text-slate-300 text-start transition-colors border border-slate-800/40"
                  >
                    <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">{profile.contact.linkedinUrl.replace('https://www.', '')}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Professional Summary */}
            {profile.summary && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-400">درباره من / خلاصه رزومه</span>
                <p
                  onClick={() => handleFieldClick(profile.summary || '', 'خلاصه')}
                  className="text-xs text-slate-300 leading-relaxed cursor-pointer hover:text-white transition-colors"
                >
                  {profile.summary}
                </p>
              </div>
            )}

            {/* Work Experiences */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-sky-400" />
                <span>سوابق شغلی و تجربیات ({profile.experiences.length})</span>
              </span>

              {profile.experiences.map((exp) => (
                <div
                  key={exp.id}
                  onClick={() => handleFieldClick(exp.company, 'سوابق کاری')}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-2 hover:border-slate-700 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{exp.title}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                      {exp.startDate} {exp.isCurrent ? '- اکنون' : exp.endDate ? `- ${exp.endDate}` : ''}
                    </span>
                  </div>
                  <span className="text-xs text-sky-400 font-medium">{exp.company}</span>

                  <ul className="mt-2 space-y-1">
                    {exp.achievements.map((ach, idx) => (
                      <li
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFieldClick(ach, 'دستاورد');
                        }}
                        className="text-xs text-slate-300 flex items-start gap-2 hover:text-white"
                      >
                        <span className="text-sky-500 font-bold">•</span>
                        <span>{ach}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Education */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                <span>تحصیلات و مدارک</span>
              </span>

              {profile.education.map((edu) => (
                <div
                  key={edu.id}
                  onClick={() => handleFieldClick(edu.institution, 'تحصیلات')}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col gap-1.5 cursor-pointer hover:border-slate-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      {edu.degree} {edu.fieldOfStudy ? `- ${edu.fieldOfStudy}` : ''}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {edu.startDate} - {edu.endDate}
                    </span>
                  </div>
                  <span className="text-xs text-indigo-400 font-medium">{edu.institution}</span>
                </div>
              ))}
            </div>

            {/* Skills Taxonomy */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>مهارت‌های اعتبارسنجی‌شده ({profile.skills.length})</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => handleFieldClick(skill.name, 'مهارت')}
                    className="px-2.5 py-1 rounded-lg text-xs bg-slate-900 border border-slate-800 hover:border-sky-500/50 text-slate-200 hover:text-sky-300 transition-colors"
                  >
                    {skill.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Source Document & Provenance Viewer */}
          <div className="h-full overflow-y-auto bg-slate-950/80 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-200">سند منبع: resume_01_fa_standard.txt</span>
              </div>
              <span className="text-[11px] text-slate-400">صفحه ۱ از ۱</span>
            </div>

            {/* Active Field Focus Banner */}
            {activeHighlight && (
              <div className="rounded-lg bg-sky-500/10 border border-sky-500/30 p-2.5 flex items-center justify-between text-xs text-sky-300">
                <span>نمایش منبع فیلد: <strong>{activeFieldLabel}</strong></span>
                <span className="text-[10px] text-slate-400">تطبیق مکانی در سند اصلی</span>
              </div>
            )}

            {/* Document Viewer with Text Highlight Layer */}
            <div className="flex-1 rounded-xl border border-slate-800/80 bg-slate-900/30 p-6 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap select-text">
              {SAMPLE_DOCUMENT_TEXT.split('\n').map((line, idx) => {
                const isHighlighted = activeHighlight && line.includes(activeHighlight);
                return (
                  <div
                    key={idx}
                    className={`py-0.5 rounded px-1.5 transition-colors ${
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
