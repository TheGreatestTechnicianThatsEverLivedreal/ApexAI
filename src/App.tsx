/**
 * ApexAI - F1 Driver Sim Orchestrator & Control Deck
 * Main Application Shell
 */

import React from 'react';
import { SimProvider, useSim } from './context/SimContext.tsx';
import { RightRailNav } from './components/layout/RightRailNav.tsx';
import { TrainScreen } from './components/screens/TrainScreen.tsx';
import { SetupScreen } from './components/screens/SetupScreen.tsx';
import { BuilderScreen } from './components/screens/BuilderScreen.tsx';
import { CarSetupScreen } from './components/screens/CarSetupScreen.tsx';
import { LearnerScreen } from './components/screens/LearnerScreen.tsx';
import { RewardsScreen } from './components/screens/RewardsScreen.tsx';
import { ValuesScreen } from './components/screens/ValuesScreen.tsx';
import { TracksScreen } from './components/screens/TracksScreen.tsx';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

const MainLayout: React.FC = () => {
  const {
    activeScreen,
    uncleanShutdown,
    resumeLastRun,
    dismissUncleanNotice
  } = useSim();

  const renderScreen = () => {
    switch (activeScreen) {
      case 'train':
        return <TrainScreen />;
      case 'setup':
        return <SetupScreen />;
      case 'builder':
        return <BuilderScreen />;
      case 'car_setup':
        return <CarSetupScreen />;
      case 'learner':
        return <LearnerScreen />;
      case 'rewards':
        return <RewardsScreen />;
      case 'values':
        return <ValuesScreen />;
      case 'tracks':
        return <TracksScreen />;
      default:
        return <TrainScreen />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#07090F] text-[#D7DEEC] overflow-hidden select-none font-mono">
      {/* Unclean Shutdown Recovery Notification Banner */}
      {uncleanShutdown && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#FFC247]/20 border-2 border-[#FFC247] text-[#FFC247] shadow-[0_0_20px_rgba(255,194,71,0.35)] flex items-center gap-3 backdrop-blur-md">
          <AlertTriangle className="w-4 h-4 text-[#FFC247]" />
          <span className="text-xs font-bold">
            Unclean shutdown detected from previous run. Rolling autosave snapshot available.
          </span>
          <button
            onClick={resumeLastRun}
            className="flex items-center gap-1 px-3 py-1 bg-[#FFC247] text-black font-bold text-xs rounded-lg hover:bg-[#FFC247]/90 transition-all cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Resume Last Run</span>
          </button>
          <button
            onClick={dismissUncleanNotice}
            className="p-1 text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Screen Content View */}
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden flex flex-col">
        {renderScreen()}
      </main>

      {/* Right Rail Navigation (On all main pages) */}
      <RightRailNav />
    </div>
  );
};

export default function App() {
  return (
    <SimProvider>
      <MainLayout />
    </SimProvider>
  );
}
