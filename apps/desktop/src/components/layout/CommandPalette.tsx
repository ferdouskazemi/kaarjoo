import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { useTranslation } from 'react-i18next';
import { useAppStore, AppView } from '../../stores/appStore.js';
import { TARGET_LANGUAGE_LABELS } from '../../i18n/constants.js';
import { KeyboardHint } from '../ui/KeyboardHint.js';
import {
  LayoutDashboard,
  User,
  Briefcase,
  Inbox,
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
    <div
      className="fixed inset-0 z-50 bg-bg/80 backdrop-blur-xs flex items-start justify-center pt-24 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('command.placeholder')}
      onClick={(e) => {
        if (e.target === e.currentTarget) setCommandPaletteOpen(false);
      }}
    >
      <div className="w-full max-w-lg rounded-[var(--radius-lg)] border border-border-strong bg-surface shadow-2xl overflow-hidden">
        <Command label="Command Menu" className="w-full flex flex-col">
          <div className="flex items-center gap-2 px-3 border-b border-border">
            <Search className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
            <Command.Input
              autoFocus
              placeholder={t('command.placeholder')}
              className="w-full py-3 bg-transparent text-sm text-text placeholder:text-muted outline-none"
            />
            <KeyboardHint keys="Esc" />
          </div>

          <Command.List className="max-h-[420px] overflow-y-auto p-2 flex flex-col gap-1">
            <Command.Empty className="py-6 text-center text-xs text-muted">
              {t('command.noResults')}
            </Command.Empty>

            <Command.Group heading={t('command.navigate')} className="text-xs font-semibold text-muted px-2 py-1">
              <Command.Item
                onSelect={() => navigateTo('home')}
                className="flex items-center justify-between px-2.5 py-2 rounded-[var(--radius-md)] text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-accent" aria-hidden="true" />
                  <span>{t('nav.home')}</span>
                </span>
                <KeyboardHint keys="G H" />
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('profile')}
                className="flex items-center justify-between px-2.5 py-2 rounded-[var(--radius-md)] text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-accent" aria-hidden="true" />
                  <span>{t('nav.profile')}</span>
                </span>
                <KeyboardHint keys="G P" />
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('jobs')}
                className="flex items-center justify-between px-2.5 py-2 rounded-[var(--radius-md)] text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-accent" aria-hidden="true" />
                  <span>{t('nav.jobs')}</span>
                </span>
                <KeyboardHint keys="G O" />
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('queue')}
                className="flex items-center justify-between px-2.5 py-2 rounded-[var(--radius-md)] text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-accent" aria-hidden="true" />
                  <span>{t('nav.queue')}</span>
                </span>
                <KeyboardHint keys="G R" />
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('applications')}
                className="flex items-center justify-between px-2.5 py-2 rounded-[var(--radius-md)] text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent" aria-hidden="true" />
                  <span>{t('nav.applications')}</span>
                </span>
                <KeyboardHint keys="G T" />
              </Command.Item>
              <Command.Item
                onSelect={() => navigateTo('settings')}
                className="flex items-center justify-between px-2.5 py-2 rounded-[var(--radius-md)] text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-accent" aria-hidden="true" />
                  <span>{t('nav.settings')}</span>
                </span>
                <KeyboardHint keys="G S" />
              </Command.Item>
            </Command.Group>

            <Command.Group heading={t('command.actions')} className="text-xs font-semibold text-muted px-2 py-1 mt-1 border-t border-border pt-1">
              <Command.Item
                onSelect={() => {
                  setLanguage(language === 'fa' ? 'en' : 'fa');
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-md)] text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer"
              >
                <Languages className="w-4 h-4 text-accent" aria-hidden="true" />
                <span>
                  {t('common.language')}: {TARGET_LANGUAGE_LABELS[language === 'fa' ? 'en' : 'fa']}
                </span>
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setTheme(theme === 'dark' ? 'light' : 'dark');
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-md)] text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-warning" aria-hidden="true" />
                ) : (
                  <Moon className="w-4 h-4 text-accent" aria-hidden="true" />
                )}
                <span>{t('common.theme')}: {theme === 'dark' ? 'Light' : 'Dark'}</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
