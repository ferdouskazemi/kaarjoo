import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'motion/react';
import { useAppStore, AppView } from '../../stores/appStore.js';
import { useApplications, useProfile } from '../../queries/index.js';
import { TARGET_LANGUAGE_LABELS } from '../../i18n/constants.js';
import { cn } from '../ui/cn.js';
import { cardEnterVariants } from '../../styles/motion.js';
import {
  Sun,
  Moon,
  Briefcase,
  Inbox,
  Home,
  User,
  SlidersHorizontal,
  MessageSquareText,
  Settings,
  Languages,
  Command,
} from 'lucide-react';

interface RailItem {
  id: AppView;
  labelKey: string;
  fallback: string;
  icon: React.ElementType;
  badgeKey?: 'apps';
}

const railItems: RailItem[] = [
  { id: 'home', labelKey: 'nav.today', fallback: 'Today', icon: Home },
  { id: 'jobs', labelKey: 'nav.jobsShort', fallback: 'Jobs', icon: Briefcase },
  { id: 'queue', labelKey: 'nav.appsShort', fallback: 'Apps', icon: Inbox, badgeKey: 'apps' },
];

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const {
    currentView,
    setCurrentView,
    language,
    setLanguage,
    theme,
    setTheme,
    setCommandPaletteOpen,
  } = useAppStore();
  const { data: dbApplications = [] } = useApplications();
  const { data: dbProfile } = useProfile();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const needsYouCount = dbApplications.filter(
    (a) => a.status === 'needs_user' || a.status === 'needs_review'
  ).length;

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const initials = (dbProfile?.contact?.fullName || 'K')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'K';

  const navigate = (view: AppView) => {
    setCurrentView(view);
    setMenuOpen(false);
  };

  return (
    <aside className="w-[76px] border-e border-border bg-surface flex flex-col items-center py-4 gap-2 select-none shrink-0 text-text relative z-30">
      {/* Brand mark */}
      <button
        type="button"
        onClick={() => navigate('home')}
        aria-label={t('app.name')}
        className="w-9 h-9 rounded-[10px] bg-accent text-bg font-extrabold text-base grid place-items-center mb-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        K
      </button>

      {/* 3 Primary Destinations */}
      <nav className="flex flex-col items-center gap-1.5 w-full px-2" aria-label="Main navigation">
        {railItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.id === 'queue'
              ? currentView === 'queue' || currentView === 'applications'
              : currentView === item.id;
          const showDot = item.badgeKey === 'apps' && needsYouCount > 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative w-[60px] py-2 rounded-[12px] flex flex-col items-center gap-1 text-xs font-medium transition-colors cursor-pointer',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                isActive ? 'bg-accent-weak text-text' : 'text-muted hover:text-text hover:bg-surface-2'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive ? 'text-accent-text' : 'text-current')} aria-hidden="true" />
              <span className="truncate max-w-full px-1">
                {t(item.labelKey, { defaultValue: item.fallback })}
              </span>
              {showDot && (
                <span
                  className="absolute top-1.5 end-2.5 w-2 h-2 rounded-full bg-danger"
                  aria-label={`${needsYouCount} need attention`}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-1" />

      {/* Avatar Menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-label="Account and settings menu"
          className="w-10 h-10 rounded-full bg-surface-3 hover:bg-border-strong text-text-2 font-bold text-sm grid place-items-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {initials}
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              variants={cardEnterVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              role="menu"
              className="absolute bottom-0 start-[68px] w-60 bg-surface border border-border-strong rounded-[14px] shadow-2xl p-1.5 flex flex-col gap-0.5 z-50"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => navigate('profile')}
                className="min-h-[40px] px-3 py-2 rounded-[var(--radius-sm)] flex items-center gap-2.5 text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer text-start"
              >
                <User className="w-4 h-4 text-muted" aria-hidden="true" />
                <span>{t('nav.profile')}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => navigate('preferences')}
                className="min-h-[40px] px-3 py-2 rounded-[var(--radius-sm)] flex items-center gap-2.5 text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer text-start"
              >
                <SlidersHorizontal className="w-4 h-4 text-muted" aria-hidden="true" />
                <span>What I&apos;m looking for</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => navigate('answers')}
                className="min-h-[40px] px-3 py-2 rounded-[var(--radius-sm)] flex items-center gap-2.5 text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer text-start"
              >
                <MessageSquareText className="w-4 h-4 text-muted" aria-hidden="true" />
                <span>Answer bank</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => navigate('settings')}
                className="min-h-[40px] px-3 py-2 rounded-[var(--radius-sm)] flex items-center gap-2.5 text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer text-start"
              >
                <Settings className="w-4 h-4 text-muted" aria-hidden="true" />
                <span>{t('nav.settings')}</span>
              </button>

              <div className="my-1 border-t border-border" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setLanguage(language === 'fa' ? 'en' : 'fa');
                  setMenuOpen(false);
                }}
                className="min-h-[40px] px-3 py-2 rounded-[var(--radius-sm)] flex items-center justify-between text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Languages className="w-4 h-4 text-muted" aria-hidden="true" />
                  <span>{t('common.language')}</span>
                </span>
                <span className="text-xs text-muted">{TARGET_LANGUAGE_LABELS[language]}</span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setTheme(theme === 'dark' ? 'light' : 'dark');
                  setMenuOpen(false);
                }}
                className="min-h-[40px] px-3 py-2 rounded-[var(--radius-sm)] flex items-center justify-between text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  {theme === 'dark' ? (
                    <Moon className="w-4 h-4 text-muted" aria-hidden="true" />
                  ) : (
                    <Sun className="w-4 h-4 text-muted" aria-hidden="true" />
                  )}
                  <span>{t('common.theme')}</span>
                </span>
                <span className="text-xs text-muted">
                  {theme === 'dark' ? t('common.dark') : t('common.light')}
                </span>
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setCommandPaletteOpen(true);
                }}
                className="min-h-[40px] px-3 py-2 rounded-[var(--radius-sm)] flex items-center justify-between text-sm text-text-2 hover:text-text hover:bg-surface-2 cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Command className="w-4 h-4 text-muted" aria-hidden="true" />
                  <span>Quick search</span>
                </span>
                <kbd className="text-xs font-mono text-muted">⌘K</kbd>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
};
