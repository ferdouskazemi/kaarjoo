import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, AppView } from '../../stores/appStore';
import { useApplicationStore } from '../../stores/applicationStore';
import { useApplications } from '../../queries/index.js';
import {
  LayoutDashboard,
  User,
  Briefcase,
  ListTodo,
  CheckCircle2,
  Settings,
  Search,
  Languages,
  Moon,
  Sun,
  ShieldCheck,
} from 'lucide-react';

interface NavItem {
  id: AppView;
  labelKey: string;
  icon: React.ElementType;
  badgeKey?: 'queue';
  shortcut: string;
}

const navItems: NavItem[] = [
  { id: 'home', labelKey: 'nav.home', icon: LayoutDashboard, shortcut: '1' },
  { id: 'profile', labelKey: 'nav.profile', icon: User, shortcut: '2' },
  { id: 'jobs', labelKey: 'nav.jobs', icon: Briefcase, shortcut: '3' },
  { id: 'queue', labelKey: 'nav.queue', icon: ListTodo, badgeKey: 'queue', shortcut: '4' },
  { id: 'applications', labelKey: 'nav.applications', icon: CheckCircle2, shortcut: '5' },
  { id: 'settings', labelKey: 'nav.settings', icon: Settings, shortcut: '6' },
];

import { TARGET_LANGUAGE_LABELS } from '../../i18n/constants.js';

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const { currentView, setCurrentView, language, setLanguage, theme, setTheme, setCommandPaletteOpen } = useAppStore();
  const { applications } = useApplicationStore();
  const { data: dbApplications = [] } = useApplications();
  const queueCount = dbApplications.length > 0 ? dbApplications.length : applications.length;

  const toggleLanguage = () => {
    setLanguage(language === 'fa' ? 'en' : 'fa');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside className="w-60 border-e border-[#242424] bg-[#141414] flex flex-col justify-between p-3 select-none shrink-0 text-[#f4f4f5]">
      <div className="flex flex-col gap-2">
        {/* Search / Command Bar Trigger (Flash-Rive Field Style) */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#282828] hover:border-[#383838] text-[#a1a1aa] hover:text-[#f4f4f5] transition-all text-xs cursor-pointer group"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-[#71717a] group-hover:text-sky-400 transition-colors shrink-0" />
            <span className="truncate">{t('command.placeholder')}</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#222222] text-[#a1a1aa] rounded border border-[#2f2f2f]">
            Ctrl+K
          </kbd>
        </button>

        {/* Navigation List */}
        <nav className="mt-2 flex flex-col gap-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const badgeCount = item.badgeKey === 'queue' ? queueCount : undefined;

            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer relative ${
                  isActive
                    ? 'bg-[#202020] text-[#f4f4f5] border border-[#333333] shadow-sm font-semibold active-ring'
                    : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#1a1a1a] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-sky-400' : 'text-[#a1a1aa]'
                    }`}
                  />
                  <span>{t(item.labelKey)}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {badgeCount !== undefined && badgeCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold tabular-nums bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      {badgeCount}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-[#a1a1aa] opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.shortcut}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls & System Status */}
      <div className="flex flex-col gap-2 pt-3 border-t border-[#242424]">
        <div className="flex items-center justify-between px-1">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#202020] transition-colors cursor-pointer"
            title={t('common.language')}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{TARGET_LANGUAGE_LABELS[language]}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#202020] transition-colors cursor-pointer"
            title={t('common.theme')}
            aria-label={t('common.theme')}
          >
            {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Local Verification Shield */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#161616] border border-[#242424] text-[10px] text-[#71717a] font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            <span>100% LOCAL</span>
          </span>
          <span>ATS v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};
