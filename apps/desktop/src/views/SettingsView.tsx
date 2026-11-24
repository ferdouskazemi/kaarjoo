import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../stores/appStore.js';
import { useWipeAllData } from '../queries/index.js';
import { LANGUAGE_NAMES } from '../i18n/constants.js';
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
  const { t } = useTranslation();
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
    if (window.confirm(t('settings.clearConfirm'))) {
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
        <h1 className="text-2xl font-bold text-slate-100">{t('settings.title')}</h1>
        <p className="text-sm text-slate-400 mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* Demo Mode Toggle Card */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-amber-200">
                {t('settings.demoModeTitle')}
              </h2>
            </div>
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-mono font-medium border ${
                demoMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {demoMode ? t('settings.active') : t('settings.disabled')}
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {t('settings.demoModeDesc')}
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => setDemoMode(!demoMode)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                demoMode
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {demoMode ? t('settings.turnOffDemo') : t('settings.turnOnDemo')}
            </button>
          </div>
        </div>

        {/* Language & Theme Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            <span>{t('settings.appearance')}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">{t('settings.languageSetting')}</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'fa' | 'en')}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="en">{LANGUAGE_NAMES.en} (LTR)</option>
                <option value="fa">{LANGUAGE_NAMES.fa} (RTL)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400">{t('common.theme')}</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'system')}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="dark">{t('common.dark')}</option>
                <option value="light">{t('common.light')}</option>
                <option value="system">{t('common.system')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* AI Hardware Tier Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>{t('settings.engineConfig')}</span>
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium font-mono">
              100% Offline
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'lite', title: 'Lite (3B–4B)', desc: t('settings.tierLiteDesc') },
              { id: 'standard', title: 'Standard (7B–9B)', desc: t('settings.tierStandardDesc') },
              { id: 'pro', title: 'Pro (14B+)', desc: t('settings.tierProDesc') },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setHardwareTier(item.id as any)}
                className={`p-3.5 rounded-xl border text-start transition-all flex flex-col gap-1.5 cursor-pointer ${
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
            <span>{t('settings.browserSettings')}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="flex flex-col gap-1.5">
              <span className="text-slate-400">{t('settings.defaultBrowser')}</span>
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
              <span className="text-slate-400">{t('settings.executionMode')}</span>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={isHeadless}
                  onChange={(e) => setIsHeadless(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-800 text-sky-500"
                />
                <span className="text-xs text-slate-300">{t('settings.headless')}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Local Database & Backup Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <span>{t('settings.dbPersistence')}</span>
            </h2>
            <span className="text-[11px] font-mono text-slate-500">
              %APPDATA%\kaarjoo\kaarjoo.db
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {t('settings.dbDesc')}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleBackupDb}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {backupSuccess ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Download className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{backupSuccess ? t('settings.backupCreated') : t('settings.backup')}</span>
            </button>

            <button
              onClick={handleWipeData}
              disabled={wipeMutation.isPending}
              className="px-4 py-2 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 text-xs font-semibold text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{wipeSuccess ? t('settings.dataWiped') : t('settings.clearDatabase')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
