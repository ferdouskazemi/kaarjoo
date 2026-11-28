import React, { useEffect, useRef } from 'react';
import { MotionConfig } from 'motion/react';
import { TitleBar } from './TitleBar.js';
import { Sidebar } from './Sidebar.js';
import { CommandPalette } from './CommandPalette.js';
import { AutoPipelineBar } from '../pipeline/AutoPipelineBar.js';
import { useAppStore, type AppView } from '../../stores/appStore.js';
import { commands } from '../../bindings.js';
import { HomeView } from '../../views/HomeView.js';
import { ProfileView } from '../../views/ProfileView.js';
import { JobsView } from '../../views/JobsView.js';
import { QueueView } from '../../views/QueueView.js';
import { ApplicationsView } from '../../views/ApplicationsView.js';
import { SettingsView } from '../../views/SettingsView.js';

const G_SHORTCUTS: Record<string, AppView> = {
  h: 'home',
  p: 'profile',
  o: 'jobs',
  r: 'queue',
  t: 'applications',
  s: 'settings',
};

export const AppShell: React.FC = () => {
  const { currentView, setCurrentView, setEngineConnected } = useAppStore();
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

  // Global keyboard shortcuts: G then H/P/O/R/T/S
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
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto flex flex-col bg-bg">
            <AutoPipelineBar />
            {renderCurrentView()}
          </main>
        </div>
        <CommandPalette />
      </div>
    </MotionConfig>
  );
};
