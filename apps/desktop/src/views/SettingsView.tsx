import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore';
import { Cpu, Globe, Shield } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { t } = useTranslation();
  const { language, setLanguage, theme, setTheme, hardwareTier, setHardwareTier } = useAppStore();

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">{t('nav.settings')}</h1>
        <p className="text-sm text-slate-400 mt-1">
          تنظیمات محلی هوش مصنوعی، ترجیحات کاربری و مدیریت داده‌های روی دستگاه.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Language & Theme Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            <span>زبان و ظاهر رابط کاربری</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">زبان برنامه</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'fa' | 'en')}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="fa">فارسی (RTL)</option>
                <option value="en">English (LTR)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">پوسته</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'system')}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="dark">تاریک (Dark)</option>
                <option value="light">روشن (Light)</option>
                <option value="system">پیرو سیستم (System)</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI Hardware Tier Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>سطح سخت‌افزار و مدل هوش مصنوعی محلی</span>
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
              اجرای ۱۰۰٪ آفلاین
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'lite', title: 'Lite (3B–4B)', desc: 'برای سیستم‌های با ۸ گیگابایت رم بدون گرافیک مجزا' },
              { id: 'standard', title: 'Standard (7B–9B)', desc: 'پیش‌فرض؛ مناسب ۱۶ گیگابایت رم یا اپل سیلیکون' },
              { id: 'pro', title: 'Pro (14B+)', desc: 'برای سیستم‌های با ۳۲ گیگابایت رم یا کارت گرافیک قدرتمند' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setHardwareTier(item.id as any)}
                className={`p-3.5 rounded-xl border text-start transition-all flex flex-col gap-1.5 ${
                  hardwareTier === item.id
                    ? 'border-sky-500 bg-sky-500/10 shadow-sm'
                    : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold text-slate-200">{item.title}</span>
                <span className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Privacy & Limits Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>حریم خصوصی و سقف‌های ایمنی ارسال</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="flex flex-col gap-1">
              <span className="text-slate-400">حداکثر ارسال خودکار در روز</span>
              <input
                type="number"
                defaultValue={15}
                min={1}
                max={50}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-slate-400">حداقل امتیاز انطباق جهت ثبت</span>
              <input
                type="number"
                defaultValue={75}
                min={50}
                max={99}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
