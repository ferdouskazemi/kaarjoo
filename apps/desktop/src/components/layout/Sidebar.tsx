import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore, AppView } from '../../stores/appStore';
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
} from 'lucide-react';

interface NavItem {
  id: AppView;
  labelKey: string;
  icon: React.ElementType;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'home', labelKey: 'nav.home', icon: LayoutDashboard },
  { id: 'profile', labelKey: 'nav.profile', icon: User },
  { id: 'jobs', labelKey: 'nav.jobs', icon: Briefcase },
  { id: 'queue', labelKey: 'nav.queue', icon: ListTodo },
  { id: 'applications', labelKey: 'nav.applications', icon: CheckCircle2 },
  { id: 'settings', labelKey: 'nav.settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const { currentView, setCurrentView, language, setLanguage, theme, setTheme, setCommandPaletteOpen } = useAppStore();

  const toggleLanguage = () => {
    setLanguage(language === 'fa' ? 'en' : 'fa');
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <aside className="w-64 border-e border-slate-800/80 bg-slate-950/60 flex flex-col justify-between p-3 select-none shrink-0">
      <div className="flex flex-col gap-2">
        {/* Search / Command bar trigger */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition-all text-xs"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            <span>{t('command.placeholder').slice(0, 16)}...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-800/60 text-slate-400 rounded border border-slate-700">
            Ctrl+K
          </kbd>
        </button>

        {/* Navigation list */}
        <nav className="mt-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span>{t(item.labelKey)}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer controls (Language & Theme) */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 px-1">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          title="تغییر زبان / Switch Language"
        >
          <Languages className="w-3.5 h-3.5" />
          <span>{language === 'fa' ? 'English' : 'فارسی'}</span>
        </button>

        <button
          onClick={toggleTheme}
          className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
};
