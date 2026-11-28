import React, { Suspense, lazy, useEffect, useRef } from 'react';
import { MotionConfig } from 'motion/react';
import { TitleBar } from './TitleBar.js';
import { Sidebar } from './Sidebar.js';
import { CommandPalette } from './CommandPalette.js';
import { ActivityPill } from '../pipeline/ActivityPill.js';
import { useAppStore, type AppView } from '../../stores/appStore.js';
import { commands } from '../../bindings.js';
import { useProfile } from '../../queries/index.js';

const HomeView = lazy(() => import('../../views/HomeView.js').then((m) => ({ default: m.HomeView })));
const ProfileView = lazy(() => import('../../views/ProfileView.js').then((m) => ({ default: m.ProfileView })));
const JobsView = lazy(() => import('../../views/JobsView.js').then((m) => ({ default: m.JobsView })));
const QueueView = lazy(() => import('../../views/QueueView.js').then((m) => ({ default: m.QueueView })));
const ApplicationsView = lazy(() => import('../../views/ApplicationsView.js').then((m) => ({ default: m.ApplicationsView })));
const SettingsView = lazy(() => import('../../views/SettingsView.js').then((m) => ({ default: m.SettingsView })));
const PreferencesPanel = lazy(() => import('../profile/PreferencesPanel.js').then((m) => ({ default: m.PreferencesPanel })));

const G_SHORTCUTS: Record<string, AppView> = {
  h: 'home',
  t: 'home',
  p: 'profile',
  o: 'jobs',
  j: 'jobs',
  r: 'queue',
  a: 'applications',
  s: 'settings',
};

export const AppShell: React.FC = () => {
  const { currentView, setCurrentView, setEngineConnected } = useAppStore();
  const { data: dbProfile, refetch: refetchProfile } = useProfile();
  const gPressedAtRef = useRef<number>(0);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        const res = await commands.getSystemStatus();
        if (mounted && res.status === 'ok') {
          setEngineConnected(res.data.is_ready);
        }
      } catch {
        if (mounted) setEngineConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [setEngineConnected]);

  // Global keyboard shortcuts: G then T/J/A/P/S
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      const now = Date.now();
      if (key === 'g') {
        gPressedAtRef.current = now;
        return;
      }
      if (now - gPressedAtRef.current <= 800 && G_SHORTCUTS[key]) {
        e.preventDefault();
        gPressedAtRef.current = 0;
        setCurrentView(G_SHORTCUTS[key]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setCurrentView]);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />;
      case 'profile':
        return <ProfileView />;
      case 'preferences':
      case 'answers':
        return dbProfile ? (
          <div className="flex-1 overflow-y-auto">
            <PreferencesPanel
              profile={dbProfile}
              onSaveProfile={async (updated) => {
                await commands.profileSave(updated);
                await refetchProfile();
              }}
              onContinue={() => setCurrentView('jobs')}
            />
          </div>
        ) : (
          <ProfileView />
        );
      case 'jobs':
        return <JobsView />;
      case 'queue':
        return <QueueView />;
      case 'applications':
        return <ApplicationsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg text-text antialiased">
        <TitleBar />
        <div className="flex flex-1 overflow-hidden relative">
          <Sidebar />
          <main className="flex-1 overflow-y-auto flex flex-col bg-bg relative">
            <Suspense fallback={<div className="flex-1 flex items-center justify-center text-sm text-muted">Loading…</div>}>
              {renderCurrentView()}
            </Suspense>
          </main>
          <ActivityPill />
        </div>
        <CommandPalette />
      </div>
    </MotionConfig>
  );
};
