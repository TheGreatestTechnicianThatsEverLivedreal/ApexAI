import React from 'react';
import { useSim } from '../../context/SimContext.tsx';
import { ScreenId } from '../../types/index.ts';
import {
  Play,
  Sliders,
  Cpu,
  Trophy,
  Activity,
  MapPin,
  Flame,
  Zap,
  Radio,
  FileCode,
  Wrench,
  Layers
} from 'lucide-react';

export const RightRailNav: React.FC = () => {
  const {
    activeScreen,
    navigateTo,
    runState,
    speedMode,
    isDemoMode,
    setIsDemoMode,
    startTraining,
    stopTraining,
    isLearnerLocked,
    wsConnected
  } = useSim();

  const handleToggleDemo = () => {
    const nextMode = !isDemoMode;
    setIsDemoMode(nextMode);
    if (nextMode && runState === 'idle') {
      startTraining();
    } else if (!nextMode && runState === 'running') {
      stopTraining();
    }
  };

  const mainTabs: { id: ScreenId; label: string; icon: React.ReactNode }[] = [
    { id: 'train', label: 'Train', icon: <Play className="w-4 h-4" /> },
    { id: 'setup', label: 'Setup', icon: <Sliders className="w-4 h-4" /> },
    { id: 'learner', label: 'Learner', icon: <FileCode className="w-4 h-4" /> },
    { id: 'rewards', label: 'Rewards', icon: <Trophy className="w-4 h-4" /> },
    { id: 'values', label: 'Values', icon: <Activity className="w-4 h-4" /> },
    { id: 'tracks', label: 'Tracks', icon: <MapPin className="w-4 h-4" /> }
  ];

  return (
    <aside className="w-56 shrink-0 h-screen bg-[#0D111A] border-l-2 border-[#1E2740] flex flex-col justify-between select-none z-30">
      {/* Top Branding */}
      <div>
        <div className="p-4 border-b-2 border-[#1E2740] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#19B8C9] to-[#F0388F] flex items-center justify-center font-black text-black text-sm tracking-tighter">
              F1
            </div>
            <div>
              <div className="text-xs font-bold tracking-wider text-[#D7DEEC] uppercase">ApexAI</div>
              <div className="text-[10px] text-[#7C88A6] font-mono">SIM DECK v1.4</div>
            </div>
          </div>

          {/* Connection pulse */}
          <div className="flex items-center gap-1.5" title={wsConnected ? "Core WebSocket Connected (8765)" : "Disconnected from Core"}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-[#3DFF8F] shadow-[0_0_8px_#3DFF8F]' : 'bg-[#FF4458]'}`} />
            <span className="text-[10px] text-[#7C88A6] uppercase">{wsConnected ? 'LIVE' : 'OFF'}</span>
          </div>
        </div>

        {/* Demo Mode Switch */}
        <div className="p-3 mx-2 my-2 rounded-xl bg-[#121826] border border-[#1E2740] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className={`w-3.5 h-3.5 ${isDemoMode ? 'text-[#FFC247]' : 'text-[#7C88A6]'}`} />
            <div>
              <span className="text-[11px] font-semibold tracking-wide">Demo Mode</span>
              {isDemoMode && (
                <div className="text-[9px] text-[#FFC247] font-bold">
                  {runState === 'running' ? 'Active Emitter' : 'Ready (Click Start)'}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleToggleDemo}
            className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 ease-in-out cursor-pointer ${
              isDemoMode ? 'bg-[#FFC247]' : 'bg-[#1E2740]'
            }`}
            title="Toggle Demo Mode (runs demo/fake_learner.py)"
          >
            <div
              className={`w-4 h-4 rounded-full bg-[#07090F] transition-transform duration-200 ease-in-out ${
                isDemoMode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Main Navigation Rail */}
        <nav className="p-2 space-y-1">
          {mainTabs.map((tab) => {
            const isActive = activeScreen === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigateTo(tab.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#121826] text-[#19B8C9] border-b-2 border-[#19B8C9] font-bold shadow-[0_0_12px_rgba(25,184,201,0.15)]'
                    : 'text-[#7C88A6] hover:text-[#D7DEEC] hover:bg-[#121826]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {tab.icon}
                  <span>{tab.label}</span>
                </div>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#19B8C9] shadow-[0_0_6px_#19B8C9]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sub-Screens Navigation Links */}
        <div className="mt-4 px-3">
          <div className="text-[10px] uppercase font-bold text-[#7C88A6] tracking-wider px-2 mb-1.5">
            Quick Sub-Screens
          </div>
          <div className="space-y-1">
            <button
              onClick={() => navigateTo('car_setup')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] transition-colors cursor-pointer ${
                activeScreen === 'car_setup'
                  ? 'bg-[#121826] text-[#19B8C9] font-semibold border-b-2 border-[#19B8C9]'
                  : 'text-[#7C88A6] hover:text-[#D7DEEC] hover:bg-[#121826]/40'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Car Setup (F1 2020)</span>
            </button>
            <button
              onClick={() => navigateTo('builder')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] transition-colors cursor-pointer ${
                activeScreen === 'builder'
                  ? 'bg-[#121826] text-[#19B8C9] font-semibold border-b-2 border-[#19B8C9]'
                  : 'text-[#7C88A6] hover:text-[#D7DEEC] hover:bg-[#121826]/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Model Builder</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Status & Learner Lock Status */}
      <div className="p-3 border-t-2 border-[#1E2740] bg-[#07090F]/70 text-[11px] font-mono space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[#7C88A6]">Run Status:</span>
          <span
            className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
              runState === 'running'
                ? 'bg-[#3DFF8F]/20 text-[#3DFF8F] border border-[#3DFF8F]/40'
                : runState === 'paused'
                ? 'bg-[#FFC247]/20 text-[#FFC247] border border-[#FFC247]/40'
                : 'bg-[#1E2740] text-[#7C88A6]'
            }`}
          >
            {runState}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[#7C88A6]">Speed Mode:</span>
          <span className="font-bold text-[#19B8C9] uppercase">{speedMode}</span>
        </div>

        {isLearnerLocked && (
          <div className="p-2 rounded bg-[#FF4458]/10 border border-[#FF4458]/40 text-[#FF4458] text-[10px] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4458] animate-pulse" />
            <span>Learner locked during run</span>
          </div>
        )}
      </div>
    </aside>
  );
};
