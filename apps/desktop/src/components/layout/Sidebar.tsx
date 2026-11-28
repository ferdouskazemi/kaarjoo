import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, AppView } from '../../stores/appStore.js';
import { useApplications } from '../../queries/index.js';
import { TARGET_LANGUAGE_LABELS } from '../../i18n/constants.js';
import { formatNumber } from '../../utils/formatters.js';
import { cn } from '../ui/cn.js';
import { Badge } from '../ui/Badge.js';
import { KeyboardHint } from '../ui/KeyboardHint.js';
import {
  LayoutDashboard,
  User,
  Briefcase,
  Inbox,
  CheckCircle2,
  Settings,
  Search,
  Languages,
  Moon,
  Sun,
} from 'lucide-react';

interface NavItem {
  id: AppView;
  labelKey: string;
  icon: React.ElementType;
  badgeKey?: 'queue';
  shortcut: string;
}

const navItems: NavItem[] = [
  { id: 'home', labelKey: 'nav.home', icon: LayoutDashboard, shortcut: 'G H' },
  { id: 'profile', labelKey: 'nav.profile', icon: User, shortcut: 'G P' },
  { id: 'jobs', labelKey: 'nav.jobs', icon: Briefcase, shortcut: 'G O' },
  { id: 'queue', labelKey: 'nav.queue', icon: Inbox, badgeKey: 'queue', shortcut: 'G R' },
  { id: 'applications', labelKey: 'nav.applications', icon: CheckCircle2, shortcut: 'G T' },
  { id: 'settings', labelKey: 'nav.settings', icon: Settings, shortcut: 'G S' },
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
    engineConnected,
  } = useAppStore();
  const { data: dbApplications = [] } = useApplications();

  const needsYouCount = dbApplications.filter(
    (a) => a.status === 'needs_user' || a.status === 'needs_review'
  ).length;
  const hasChromeOpen = dbApplications.some((a) => a.status === 'needs_user' || a.status === 'submitting');

  const footerStatusText = !engineConnected
    ? 'Restarting engine…'
    : hasChromeOpen
    ? 'Chrome window open'
    : 'Ready · works offline';

  return (
    <aside className="w-[232px] border-e border-border bg-surface flex flex-col justify-between p-3 select-none shrink-0 text-text">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setCommandPaletteOpen(true)}
          aria-label={t('command.placeholder')}
          className="min-h-[40px] flex items-center justify-between px-3 py-2 rounded-[var(--radius-md)] bg-surface-2 border border-border hover:border-border-strong text-muted hover:text-text transition-colors text-xs cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-muted group-hover:text-accent shrink-0" aria-hidden="true" />
            <span className="truncate">{t('command.placeholder')}</span>
          </div>
          <KeyboardHint keys="⌘K" />
        </button>

        <nav className="mt-1 flex flex-col gap-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const showRedBadge = item.badgeKey === 'queue' && needsYouCount > 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentView(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group min-h-[40px] flex items-center justify-between px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-colors cursor-pointer',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isActive
                    ? 'bg-surface-3 text-text border border-border-strong font-semibold'
                    : 'text-text-2 hover:text-text hover:bg-surface-2 border border-transparent'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={cn('w-4 h-4 shrink-0', isActive ? 'text-accent' : 'text-muted')}
                    aria-hidden="true"
                  />
                  <span className="truncate">{t(item.labelKey)}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {showRedBadge && (
                    <Badge tone="bad" className="tabular-nums">
                      {formatNumber(needsYouCount, language)}
                    </Badge>
                  )}
                  <span className="text-xs font-mono text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.shortcut}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2 pt-3 border-t border-border">
        <div className="flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => setLanguage(language === 'fa' ? 'en' : 'fa')}
            className="min-h-[40px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium text-text-2 hover:text-text hover:bg-surface-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title={t('common.language')}
            aria-label={t('common.language')}
          >
            <Languages className="w-4 h-4" aria-hidden="true" />
            <span>{TARGET_LANGUAGE_LABELS[language]}</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-[var(--radius-sm)] text-text-2 hover:text-text hover:bg-surface-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            title={t('common.theme')}
            aria-label={t('common.theme')}
          >
            {theme === 'dark' ? (
              <Moon className="w-4 h-4" aria-hidden="true" />
            ) : (
              <Sun className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-surface-2 border border-border text-xs text-muted">
          <span
            className={cn(
              'w-2 h-2 rounded-full shrink-0',
              !engineConnected ? 'bg-warning' : hasChromeOpen ? 'bg-accent' : 'bg-success'
            )}
            aria-hidden="true"
          />
          <span className="truncate">{footerStatusText}</span>
        </div>
      </div>
    </aside>
  );
};
