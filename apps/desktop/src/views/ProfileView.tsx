import React from 'react';
import { useTranslation } from 'react-i18next';
import { UploadCloud } from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{t('nav.profile')}</h1>
          <p className="text-sm text-slate-400 mt-1">
            رزومه‌ها و اسناد کاری خود را بارگذاری کنید تا پروفایل ساختاریافته شما با تکیه بر اسناد اصلی شکل گیرد.
          </p>
        </div>
      </div>

      {/* Drop Zone Box */}
      <div className="border-2 border-dashed border-slate-800 hover:border-sky-500/50 rounded-2xl bg-slate-900/20 hover:bg-slate-900/40 p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">
          فایل‌های رزومه خود را اینجا بکشید یا کلیک کنید
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md">
          پشتیبانی از PDF، DOCX، DOC، ODT، RTF، TXT، تصاویر اسکن‌شده (OCR فارسی و انگلیسی) و خروجی رزومه لینکدین
        </p>
        <span className="mt-4 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
          حداکثر ۲۰ مگابایت بر هر فایل
        </span>
      </div>
    </div>
  );
};
