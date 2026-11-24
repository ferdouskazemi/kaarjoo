import React from 'react';
import { TitleBar } from './TitleBar';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { useAppStore } from '../../stores/appStore';
import { HomeView } from '../../views/HomeView';
import { ProfileView } from '../../views/ProfileView';
import { JobsView } from '../../views/JobsView';
import { QueueView } from '../../views/QueueView';
import { ApplicationsView } from '../../views/ApplicationsView';
import { SettingsView } from '../../views/SettingsView';

export const AppShell: React.FC = () => {
  const { currentView } = useAppStore();

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#111111] text-[#f4f4f5] antialiased">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex flex-col bg-[#111111]">
          {renderCurrentView()}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
};
