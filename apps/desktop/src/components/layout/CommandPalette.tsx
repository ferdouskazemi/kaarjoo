import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { useTranslation } from 'react-i18next';
import { useAppStore, AppView } from '../../stores/appStore.js';
import { TARGET_LANGUAGE_LABELS } from '../../i18n/constants.js';
import {
  LayoutDashboard,
  User,
  Briefcase,
  ListTodo,
  CheckCircle2,
  Settings,
  Languages,
  Moon,
  Sun,
  Search,
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const { t } = useTranslation();
  const { isCommandPaletteOpen, setCommandPaletteOpen, setCurrentView, language, setLanguage, theme, setTheme } =
    useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const navigateTo = (view: AppView) => {
    setCurrentView(view);
    setCommandPaletteOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-start justify-center pt-24 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        <Command label="Command Menu" className="w-full flex flex-col">
          <div className="flex items-center gap-2 px-3 border-b border-slate-800">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <Command.Input
              autoFocus
              placeholder={t('command.placeholder')}
              className="w-full py-3 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
            />
          </div>

          <Command.List className="max-h-72 overflow-y-auto p-2 flex flex-col gap-1">
            <Command.Empty className="py-6 text-center text-xs text-slate-500">
              {t('command.noResults')}
            </Command.Empty>

            <Command.Group heading={t('command.navigate')} className="text-[11px] font-semibold text-slate-500 px-2 py-1">
              <Command.Item
                onSelect={() => navigateTo('home')}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-sky-400" />
                <span>{t('nav.home')}</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('profile')}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
              >
                <User className="w-4 h-4 text-sky-400" />
                <span>{t('nav.profile')}</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('jobs')}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-sky-400" />
                <span>{t('nav.jobs')}</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('queue')}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
              >
                <ListTodo className="w-4 h-4 text-sky-400" />
                <span>{t('nav.queue')}</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('applications')}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-sky-400" />
                <span>{t('nav.applications')}</span>
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('settings')}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-sky-400" />
                <span>{t('nav.settings')}</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading={t('command.actions')} className="text-[11px] font-semibold text-slate-500 px-2 py-1 mt-1 border-t border-slate-800/60 pt-1">
              <Command.Item
                onSelect={() => {
                  setLanguage(language === 'fa' ? 'en' : 'fa');
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
              >
                <Languages className="w-4 h-4 text-emerald-400" />
                <span>{TARGET_LANGUAGE_LABELS[language]}</span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setTheme(theme === 'dark' ? 'light' : 'dark');
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 cursor-pointer"
              >
                {theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>{t('common.light')}</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>{t('common.dark')}</span>
                  </>
                )}
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
