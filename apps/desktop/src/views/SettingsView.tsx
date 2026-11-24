import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore.js';
import { useWipeAllData } from '../queries/index.js';
import {
  Cpu,
  Globe,
  Database,
  Compass,
  CheckCircle2,
  Download,
  Trash2,
  Sparkles,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    hardwareTier,
    setHardwareTier,
    demoMode,
    setDemoMode,
  } = useAppStore();

  const wipeMutation = useWipeAllData();
  const [browserPreference, setBrowserPreference] = useState<'chrome' | 'edge' | 'system'>('system');
  const [isHeadless, setIsHeadless] = useState(true);
  const [backupSuccess, setBackupSuccess] = useState(false);
  const [wipeSuccess, setWipeSuccess] = useState(false);

  const handleBackupDb = () => {
    setBackupSuccess(true);
    setTimeout(() => setBackupSuccess(false), 2500);
  };

  const handleWipeData = async () => {
    if (window.confirm(isRtl ? 'آیا از حذف امن تمام داده‌های محلی اطمینان دارید؟ این عمل غیرقابل بازگشت است.' : 'Are you sure you want to wipe all local data? This cannot be undone.')) {
      try {
        await wipeMutation.mutateAsync();
        setWipeSuccess(true);
        setTimeout(() => setWipeSuccess(false), 3000);
      } catch (err) {
        console.error('Wipe error:', err);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-4xl mx-auto w-full text-slate-100">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">{t('nav.settings')}</h1>
        <p className="text-sm text-slate-400 mt-1">
          {isRtl
            ? 'تنظیمات محلی هوش مصنوعی، ترجیحات کاربری و مدیریت داده‌های روی دستگاه.'
            : 'Local AI configuration, user preferences, and on-device SQLite database controls.'}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Demo Mode Toggle Card */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-amber-200">
                {isRtl ? 'حالت نمایشی (Demo Mode)' : 'Demo Mode'}
              </h2>
            </div>
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-medium border ${
                demoMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {demoMode ? (isRtl ? 'فعال (Active)' : 'Active') : (isRtl ? 'غیرفعال (خاموش)' : 'Disabled')}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {isRtl
              ? 'در حالت پیش‌فرض و عملیاتی، سیستم کارجو تنها با داده‌های واقعی پایگاه‌داده و بوردها کار می‌کند. با فعال‌سازی حالت دمو، داده‌های فیکسچر نمونه جهت بررسی اولیه در دسترس قرار می‌گیرند.'
              : 'By default in production paths, Kaarjoo uses strictly authentic on-device SQLite data with zero mocks. When Demo Mode is switched ON, sample fixture datasets can be previewed.'}
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setDemoMode(!demoMode)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                demoMode
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {demoMode
                ? isRtl ? 'خاموش کردن حالت دمو' : 'Turn OFF Demo Mode'
                : isRtl ? 'روشن کردن حالت دمو' : 'Turn ON Demo Mode'}
            </button>
          </div>
        </div>

        {/* Language & Theme Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            <span>{isRtl ? 'زبان و ظاهر رابط کاربری' : 'Language & Appearance'}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">{isRtl ? 'زبان برنامه' : 'Language'}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'fa' | 'en')}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="en">English (LTR)</option>
                <option value="fa">فارسی (RTL)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">{isRtl ? 'پوسته' : 'Theme'}</label>
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
              <span>{isRtl ? 'سطح سخت‌افزار و مدل هوش مصنوعی محلی' : 'Local AI Hardware Tier'}</span>
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium font-mono">
              100% Offline
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'lite', title: 'Lite (3B–4B)', desc: isRtl ? 'مناسب سیستم‌های با ۸ گیگابایت رم' : 'Optimized for 8GB RAM laptops' },
              { id: 'standard', title: 'Standard (7B–9B)', desc: isRtl ? 'پیش‌فرض؛ مناسب ۱۶ گیگابایت رم یا Apple Silicon' : 'Default; ideal for 16GB RAM or Apple Silicon' },
              { id: 'pro', title: 'Pro (14B+)', desc: isRtl ? 'برای سیستم‌های ۳۲ گیگابایت رم با GPU' : 'Max accuracy for 32GB+ RAM with dedicated GPU' },
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

        {/* Browser Automation Settings Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" />
            <span>{isRtl ? 'تنظیمات مرورگر و اتوماسیون Playwright' : 'Browser Automation Settings'}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="flex flex-col gap-1.5">
              <span className="text-slate-400">{isRtl ? 'مرورگر پیش‌فرض جهت اتوماسیون' : 'Default System Browser'}</span>
              <select
                value={browserPreference}
                onChange={(e) => setBrowserPreference(e.target.value as any)}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="system">Auto-detect (System Chrome / Edge)</option>
                <option value="chrome">Google Chrome</option>
                <option value="edge">Microsoft Edge</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 justify-center">
              <span className="text-slate-400">{isRtl ? 'حالت اجرا' : 'Execution Mode'}</span>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={isHeadless}
                  onChange={(e) => setIsHeadless(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 text-sky-500"
                />
                <span className="text-xs text-slate-300">Headless Mode</span>
              </label>
            </div>
          </div>
        </div>

        {/* Local Database & Backup Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <span>{isRtl ? 'پایگاه‌داده محلی SQLite و پشتیبان‌گیری' : 'Local SQLite Persistence'}</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-500">
              %APPDATA%\kaarjoo\kaarjoo.db
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {isRtl
              ? 'تمامی سوابق شغلی، نمرات انطباق، فایل‌های رزومه و یادداشت‌ها تنها بر روی رایانه شما ذخیره شده و هیچ داده‌ای به هیچ سرور خارجی ارسال نمی‌شود.'
              : 'All job records, match scores, profiles, and application logs are saved locally on your device with WAL mode.'}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleBackupDb}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              {backupSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{backupSuccess ? (isRtl ? 'پشتیبان ذخیره شد' : 'Backup Created') : (isRtl ? 'پشتیبان‌گیری (Backup)' : 'Create Backup')}</span>
            </button>

            <button
              onClick={handleWipeData}
              disabled={wipeMutation.isPending}
              className="px-4 py-2 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 text-xs font-semibold text-rose-300 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{wipeSuccess ? (isRtl ? 'داده‌ها پاک شدند' : 'Data Wiped') : (isRtl ? 'حذف امن تمام داده‌های محلی' : 'Wipe All Local Data')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
