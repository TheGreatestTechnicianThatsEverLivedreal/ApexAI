import React, { useState } from 'react';
import { useSim } from '../../context/SimContext.tsx';
import {
  Sliders,
  Settings,
  PlusCircle,
  Info,
  Check,
  Upload,
  AlertTriangle,
  Play,
  RotateCcw,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export const SetupScreen: React.FC = () => {
  const {
    navigateTo,
    trainingStyle,
    setTrainingStyle,
    isDefaultStyle,
    setIsDefaultStyle,
    smoothAggressive,
    setSmoothAggressive,
    oversteerUndersteer,
    setOversteerUndersteer,
    physicsToggles,
    setPhysicsToggle,
    simBackend,
    setSimBackend,
    runMode,
    setRunMode,
    carCount,
    setCarCount,
    targetLaps,
    setTargetLaps,
    targetLapTimeMode,
    setTargetLapTimeMode,
    manualTargetTime,
    setManualTargetTime,
    computedTargetLapTime,
    models,
    selectedModelId,
    setSelectedModelId,
    testModelIds,
    toggleTestModelId,
    tracks,
    selectedTrackId,
    setSelectedTrackId,
    refreshModels,
    startTraining
  } = useSim();

  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);
  const [showAllModelsModal, setShowAllModelsModal] = useState<boolean>(false);
  const [customWeightsFile, setCustomWeightsFile] = useState<string>('');

  // Model deletion selection state & UI prompt modal (No browser confirm/prompt)
  const [selectedModelIdsForDeletion, setSelectedModelIdsForDeletion] = useState<string[]>([]);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    ids: string[];
    names: string[];
  } | null>(null);
  const [exportToast, setExportToast] = useState<string | null>(null);

  const physicsToggleList = [
    { key: 'advanced_aero', label: 'Advanced Aero' },
    { key: 'advanced_ers', label: 'Advanced ERS' },
    { key: 'tyre_health', label: 'Tyre Health' },
    { key: 'tyre_grip', label: 'Tyre Grip' },
    { key: 'tyre_thermals', label: 'Tyre Thermals' },
    { key: 'custom_setups', label: 'Custom Setups' },
    { key: 'noise_level', label: 'Noise Level' },
    { key: 'fuel_weight', label: 'Fuel Weight' },
    { key: 'fuel_mixes', label: 'Fuel Mixes' },
    { key: 'brake_thermals', label: 'Brake Thermals' },
    { key: 'brake_pressure', label: 'Brake Pressure' },
    { key: 'brake_bias', label: 'Brake Bias' },
    { key: 'differential', label: 'Differential' },
    { key: 'random_tyre', label: 'Random Tyre' },
    { key: 'wet_surfaces', label: 'Wet Surfaces' }
  ];

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
  const isTrainDisabled = trainingStyle === 'race';

  const handleLaunch = () => {
    if (isTrainDisabled) return;
    startTraining();
    navigateTo('train');
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto overflow-x-hidden flex p-4 bg-[#07090F] gap-4 select-none font-mono">
      {/* Left Main Setup Column */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto pr-1">
        <div>
          {/* Top Header & Settings bar */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#1E2740]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#121826] border border-[#1E2740] text-[#19B8C9]">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold uppercase tracking-wider text-[#D7DEEC]">
                  TRAINING SETUP & SIM ENGINE
                </h1>
                <p className="text-[11px] text-[#7C88A6]">
                  Configure environmental physics, driving style biases, and execution parameters
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInfoModal(true)}
                className="p-2 rounded-xl bg-[#121826] border border-[#1E2740] text-[#7C88A6] hover:text-[#D7DEEC] transition-all cursor-pointer"
                title="System Info"
              >
                <Info className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigateTo('car_setup')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#121826] border border-[#1E2740] text-xs text-[#D7DEEC] hover:border-[#19B8C9] hover:text-[#19B8C9] transition-all cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Car Setup</span>
              </button>
            </div>
          </div>

          {/* Section 1: Training Style */}
          <div className="my-4 p-4 rounded-[14px] bg-[#0D111A] border-2 border-[#1E2740] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D7DEEC]">
                Training Style & Handling Bias
              </span>
              {trainingStyle === 'race' && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-[#FF4458]/20 border border-[#FF4458] text-[#FF4458] font-bold">
                  Race mode not configured
                </span>
              )}
            </div>

            <div className="grid grid-cols-4 gap-4 items-center">
              {/* Style Toggle (Race <-> Lap Time) */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#7C88A6] uppercase">Mode Type:</span>
                <div className="flex p-0.5 rounded-xl bg-[#07090F] border border-[#1E2740]">
                  <button
                    onClick={() => setTrainingStyle('lap_time')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                      trainingStyle === 'lap_time' ? 'bg-[#19B8C9] text-black shadow-[0_0_8px_#19B8C9]' : 'text-[#7C88A6]'
                    }`}
                  >
                    Lap Time
                  </button>
                  <button
                    onClick={() => setTrainingStyle('race')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                      trainingStyle === 'race' ? 'bg-[#FF4458] text-white' : 'text-[#7C88A6]'
                    }`}
                  >
                    Race
                  </button>
                </div>
              </div>

              {/* Default Style Strategy Toggle */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-[#7C88A6] uppercase">Style Strategy:</span>
                <div className="flex p-0.5 rounded-xl bg-[#07090F] border border-[#1E2740]">
                  <button
                    onClick={() => {
                      setIsDefaultStyle(true);
                      if (smoothAggressive === 'off') setSmoothAggressive('smooth');
                      if (oversteerUndersteer === 'off') setOversteerUndersteer('oversteer');
                    }}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-all ${
                      isDefaultStyle
                        ? 'bg-[#19B8C9] text-black shadow-[0_0_8px_#19B8C9]'
                        : 'text-[#7C88A6] hover:text-[#D7DEEC]'
                    }`}
                    title="Use Defaults: Select driving style presets (Smooth/Aggressive & Oversteer/Understeer)"
                  >
                    Use Defaults
                  </button>
                  <button
                    onClick={() => {
                      setIsDefaultStyle(false);
                      setSmoothAggressive('off');
                      setOversteerUndersteer('off');
                    }}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-all ${
                      !isDefaultStyle
                        ? 'bg-[#3DFF8F] text-black shadow-[0_0_8px_#3DFF8F]'
                        : 'text-[#7C88A6] hover:text-[#D7DEEC]'
                    }`}
                    title="Autonomous / No Defaults: AI learns entirely on its own without predefined driving style presets"
                  >
                    Autonomous
                  </button>
                </div>
              </div>

              {/* Smooth / Aggressive Segmented Pill (Active when 'Use Defaults' is chosen) */}
              <div className={`flex flex-col gap-1.5 ${!isDefaultStyle ? 'opacity-35 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#7C88A6] uppercase">Driving Temperament:</span>
                  {isDefaultStyle && (
                    <span className="text-[#19B8C9] font-bold capitalize">{smoothAggressive}</span>
                  )}
                </div>
                <div className="flex p-0.5 rounded-xl bg-[#07090F] border border-[#1E2740]">
                  {(['smooth', 'aggressive'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSmoothAggressive(opt)}
                      className={`flex-1 py-1 text-[10px] font-bold uppercase rounded-lg cursor-pointer transition-all ${
                        smoothAggressive === opt && isDefaultStyle
                          ? 'bg-[#19B8C9] text-black shadow-[0_0_8px_#19B8C9]'
                          : 'text-[#7C88A6] hover:text-[#D7DEEC]'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Oversteer / Understeer Yaw Balance (Active when 'Use Defaults' is chosen) */}
              <div className={`flex flex-col gap-1.5 ${!isDefaultStyle ? 'opacity-35 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#7C88A6] uppercase">Yaw Balance:</span>
                  {isDefaultStyle && (
                    <span className="text-[#19B8C9] font-bold capitalize">{oversteerUndersteer}</span>
                  )}
                </div>
                <div className="flex p-0.5 rounded-xl bg-[#07090F] border border-[#1E2740]">
                  {(['oversteer', 'understeer'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setOversteerUndersteer(opt)}
                      className={`flex-1 py-1 text-[9px] font-bold uppercase rounded-lg cursor-pointer transition-all ${
                        oversteerUndersteer === opt && isDefaultStyle
                          ? 'bg-[#19B8C9] text-black shadow-[0_0_8px_#19B8C9]'
                          : 'text-[#7C88A6] hover:text-[#D7DEEC]'
                      }`}
                    >
                      {opt === 'oversteer' ? 'Over' : 'Under'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Helper status badge */}
            <div className="pt-1 border-t border-[#1E2740]/60">
              {isDefaultStyle ? (
                <div className="text-[10px] text-[#19B8C9] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#19B8C9]" />
                  <span>
                    <strong>Defaults Enabled:</strong> Agent policy is biased toward <strong>{smoothAggressive}</strong> inputs and <strong>{oversteerUndersteer}</strong> vehicle rotation.
                  </span>
                </div>
              ) : (
                <div className="text-[10px] text-[#3DFF8F] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3DFF8F]" />
                  <span>
                    <strong>Autonomous (No Defaults):</strong> Agent explores dynamically and learns on its own without driving style constraints or presets.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: 15 Physics Toggles (3 rows x 5) */}
          <div className="my-4 p-4 rounded-[14px] bg-[#0D111A] border-2 border-[#1E2740] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#D7DEEC]">
                Physics Subsystems (15 Engines)
              </span>
              <span className="text-[10px] text-[#7C88A6]">
                Decides whether the physical subsystem is simulated
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {physicsToggleList.map((item) => {
                const active = !!physicsToggles[item.key];
                return (
                  <button
                    key={item.key}
                    onClick={() => setPhysicsToggle(item.key, !active)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'bg-[#121826] border-[#19B8C9]/60 text-[#D7DEEC] shadow-[0_0_10px_rgba(25,184,201,0.1)]'
                        : 'bg-[#07090F] border-[#1E2740] text-[#7C88A6]'
                    }`}
                  >
                    <span className="text-[11px] font-semibold truncate pr-1">{item.label}</span>
                    <div
                      className={`w-7 h-4 rounded-full p-0.5 transition-colors ${
                        active ? 'bg-[#19B8C9]' : 'bg-[#1E2740]'
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full bg-[#07090F] transition-transform ${
                          active ? 'translate-x-3' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Run Strip & Pre-generated weights */}
          <div className="my-4 p-4 rounded-[14px] bg-[#0D111A] border-2 border-[#1E2740] space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#D7DEEC]">
              Execution Run Strip
            </div>

            <div className="grid grid-cols-5 gap-3">
              {/* Sim Backend */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[#7C88A6] uppercase">Sim Backend:</span>
                <select
                  value={simBackend}
                  onChange={(e) => setSimBackend(e.target.value as any)}
                  className="bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded-xl px-2.5 py-1.5 text-xs focus:border-[#19B8C9] outline-none cursor-pointer"
                >
                  <option value="custom">Custom C ABI Engine</option>
                  <option value="torcs">TORCS (SCR Patched)</option>
                </select>
              </div>

              {/* Mode: Train / Test */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[#7C88A6] uppercase">Execution Mode:</span>
                <div className="flex p-0.5 rounded-xl bg-[#07090F] border border-[#1E2740]">
                  <button
                    onClick={() => setRunMode('train')}
                    className={`flex-1 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                      runMode === 'train' ? 'bg-[#3DFF8F] text-black shadow-[0_0_8px_#3DFF8F]' : 'text-[#7C88A6]'
                    }`}
                  >
                    Train
                  </button>
                  <button
                    onClick={() => setRunMode('test')}
                    className={`flex-1 py-1 text-xs font-bold rounded-lg cursor-pointer ${
                      runMode === 'test' ? 'bg-[#8B6CFF] text-white shadow-[0_0_8px_#8B6CFF]' : 'text-[#7C88A6]'
                    }`}
                  >
                    Test
                  </button>
                </div>
              </div>

              {/* Parallel Car Count */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[#7C88A6] uppercase">Parallel Cars:</span>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={carCount}
                  onChange={(e) => setCarCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded-xl px-2.5 py-1 text-xs focus:border-[#19B8C9] outline-none"
                />
              </div>

              {/* Target Laps */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[#7C88A6] uppercase">Target Laps:</span>
                <input
                  type="number"
                  min="10"
                  max="100000"
                  value={targetLaps}
                  onChange={(e) => setTargetLaps(Math.max(1, parseInt(e.target.value) || 100))}
                  className="bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded-xl px-2.5 py-1 text-xs focus:border-[#19B8C9] outline-none"
                />
              </div>

              {/* Target Lap Time */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#7C88A6] uppercase">Target Lap Time:</span>
                  <button
                    onClick={() => setTargetLapTimeMode(targetLapTimeMode === 'carry_over' ? 'manual' : 'carry_over')}
                    className="text-[9px] text-[#19B8C9] underline cursor-pointer"
                  >
                    {targetLapTimeMode === 'carry_over' ? 'Switch Manual' : 'Carry-Over'}
                  </button>
                </div>
                {targetLapTimeMode === 'carry_over' ? (
                  <div className="px-2.5 py-1.5 rounded-xl bg-[#07090F] border border-[#1E2740] text-xs text-[#FFC247] flex items-center justify-between">
                    <span>Carry Over:</span>
                    <span className="font-bold">{computedTargetLapTime.toFixed(3)}s</span>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={manualTargetTime}
                    onChange={(e) => setManualTargetTime(e.target.value)}
                    placeholder="01:24.500"
                    className="bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded-xl px-2.5 py-1 text-xs focus:border-[#19B8C9] outline-none"
                  />
                )}
              </div>
            </div>

            {/* Track Selector & Pre-generated Weights */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#7C88A6] uppercase">Selected Track:</span>
                  <button
                    onClick={() => navigateTo('tracks')}
                    className="text-[10px] text-[#19B8C9] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Edit Track</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <select
                  value={selectedTrackId}
                  onChange={(e) => setSelectedTrackId(e.target.value)}
                  className="bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded-xl px-2.5 py-2 text-xs focus:border-[#19B8C9] outline-none cursor-pointer"
                >
                  {tracks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({(t.length_m / 1000).toFixed(2)} km)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-[#7C88A6] uppercase">Pre-Generated Weights File:</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customWeightsFile}
                    onChange={(e) => setCustomWeightsFile(e.target.value)}
                    placeholder="models/apex_v1_baseline/weights.bin"
                    className="flex-1 bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded-xl px-2.5 py-1.5 text-xs focus:border-[#19B8C9] outline-none"
                  />
                  <button
                    onClick={() => setCustomWeightsFile('models/apex_v4_quali_beast/weights.bin')}
                    className="px-3 py-1.5 rounded-xl bg-[#121826] border border-[#1E2740] text-xs text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer"
                  >
                    Browse
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Policy Script Status Bar */}
        <div className="pt-2 flex items-center justify-between text-xs px-3 py-1.5 rounded-xl bg-[#121826] border border-[#1E2740]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3DFF8F]" />
            <span className="text-[#D7DEEC] font-bold">Agent Script:</span>
            <span className="text-[#19B8C9]">learner/learner.py</span>
            <span className="px-1.5 py-0.2 rounded bg-[#3DFF8F]/20 text-[#3DFF8F] text-[10px] font-bold">
              Baseline Ready
            </span>
          </div>
          <button
            onClick={() => navigateTo('learner')}
            className="text-[10px] text-[#7C88A6] hover:text-[#D7DEEC] underline cursor-pointer"
          >
            Edit Policy Code
          </button>
        </div>

        {/* Big Action Button */}
        <div className="pt-2">
          <button
            onClick={handleLaunch}
            disabled={isTrainDisabled}
            className={`w-full py-3.5 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isTrainDisabled
                ? 'bg-[#1E2740] text-[#7C88A6] cursor-not-allowed'
                : runMode === 'train'
                ? 'bg-[#3DFF8F] text-black hover:bg-[#3DFF8F]/90 shadow-[0_0_18px_rgba(61,255,143,0.35)]'
                : 'bg-[#8B6CFF] text-white hover:bg-[#8B6CFF]/90 shadow-[0_0_18px_rgba(139,108,255,0.35)]'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isTrainDisabled ? 'Race Mode Not Configured' : runMode === 'train' ? 'Launch Training' : 'Launch Evaluation Test'}</span>
          </button>
        </div>
      </div>

      {/* Right Column: Past Models (10 most recent) */}
      <div className="w-84 shrink-0 flex flex-col justify-between p-3.5 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px]">
        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E2740]">
            <div>
              <div className="text-xs font-bold text-[#D7DEEC] uppercase">Past Models (10 Recent)</div>
              <div className="text-[10px] text-[#7C88A6]">
                Track: {selectedTrack?.name || 'Silverstone GP'}
              </div>
            </div>

            <button
              onClick={() => navigateTo('builder')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#19B8C9]/20 border border-[#19B8C9]/40 text-[#19B8C9] text-[10px] font-bold hover:bg-[#19B8C9]/30 transition-all cursor-pointer"
            >
              <PlusCircle className="w-3 h-3" />
              <span>Create Fresh</span>
            </button>
          </div>

          {/* Mass Selection Action Bar */}
          <div className="py-2 flex items-center justify-between text-[10px] border-b border-[#1E2740]">
            <label className="flex items-center gap-1.5 text-[#7C88A6] cursor-pointer hover:text-[#D7DEEC]">
              <input
                type="checkbox"
                checked={
                  models.slice(0, 10).length > 0 &&
                  models.slice(0, 10).every((m) => selectedModelIdsForDeletion.includes(m.id))
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedModelIdsForDeletion(models.slice(0, 10).map((m) => m.id));
                  } else {
                    setSelectedModelIdsForDeletion([]);
                  }
                }}
                className="accent-[#19B8C9] cursor-pointer rounded"
              />
              <span>Select All</span>
            </label>

            {selectedModelIdsForDeletion.length > 0 && (
              <button
                onClick={() => {
                  const names = models
                    .filter((m) => selectedModelIdsForDeletion.includes(m.id))
                    .map((m) => m.name);
                  setDeleteConfirmModal({
                    isOpen: true,
                    ids: selectedModelIdsForDeletion,
                    names
                  });
                }}
                className="px-2 py-0.5 rounded bg-[#FF4458]/20 border border-[#FF4458] text-[#FF4458] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#FF4458]/30 shadow-[0_0_8px_rgba(255,68,88,0.2)]"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Selected ({selectedModelIdsForDeletion.length})</span>
              </button>
            )}
          </div>

          {/* Model List (Expanded Memory: 10 Past Setups) */}
          <div className="py-2 space-y-2 overflow-y-auto flex-1 pr-1 max-h-[500px]">
            {models.slice(0, 10).map((m) => {
              const isBaseSelected = selectedModelId === m.id;
              const isTestSelected = testModelIds.includes(m.id);
              const trackData = m.meta?.per_track?.[selectedTrack?.name || 'Silverstone GP'];
              const avgLap = trackData?.avg_lap_s ? `${trackData.avg_lap_s.toFixed(2)}s` : '—';
              const trainingDone = trackData?.track_training_done;
              const isChecked = selectedModelIdsForDeletion.includes(m.id);

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    if (runMode === 'train') {
                      setSelectedModelId(m.id);
                    } else {
                      toggleTestModelId(m.id);
                    }
                  }}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    (runMode === 'train' && isBaseSelected) || (runMode === 'test' && isTestSelected)
                      ? 'bg-[#121826] border-[#19B8C9] shadow-[0_0_10px_rgba(25,184,201,0.2)]'
                      : 'bg-[#07090F] border-[#1E2740] hover:border-[#7C88A6]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedModelIdsForDeletion((prev) => [...prev, m.id]);
                          } else {
                            setSelectedModelIdsForDeletion((prev) => prev.filter((id) => id !== m.id));
                          }
                        }}
                        className="accent-[#FF4458] cursor-pointer rounded"
                      />
                      <span className="font-bold text-xs text-[#D7DEEC] truncate">{m.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {trainingDone ? (
                        <span className="px-1.5 py-0.2 rounded bg-[#3DFF8F]/20 text-[#3DFF8F] text-[9px] font-bold">
                          DONE
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded bg-[#FFC247]/20 text-[#FFC247] text-[9px] font-bold">
                          EXP
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmModal({
                            isOpen: true,
                            ids: [m.id],
                            names: [m.name]
                          });
                        }}
                        className="p-1 rounded text-[#7C88A6] hover:text-[#FF4458] hover:bg-[#1E2740] cursor-pointer"
                        title="Delete Model Setup"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[10px] text-[#7C88A6]">
                    <span>Laps: {m.meta?.trained_laps || 0}</span>
                    <span className="text-[#19B8C9] font-bold">Avg: {avgLap}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom All Models Modal Link */}
        <div className="pt-2 border-t border-[#1E2740]">
          <button
            onClick={() => setShowAllModelsModal(true)}
            className="w-full py-2 rounded-xl bg-[#121826] border border-[#1E2740] text-xs text-[#7C88A6] hover:text-[#D7DEEC] hover:bg-[#1E2740] transition-all cursor-pointer"
          >
            Manage All Models Repository
          </button>
        </div>
      </div>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-[520px] bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E2740] pb-2">
              <span className="font-bold text-sm text-[#D7DEEC] uppercase">Sim Architecture & Engine</span>
              <button onClick={() => setShowInfoModal(false)} className="text-[#7C88A6] hover:text-white cursor-pointer">
                ✕
              </button>
            </div>
            <div className="text-xs text-[#D7DEEC] space-y-2 font-mono">
              <p>
                <strong>ApexAI</strong> separates control orchestration and Python learner execution.
              </p>
              <p>
                • <strong>Custom C ABI Engine:</strong> High-frequency compiled vehicle dynamics model.
              </p>
              <p>
                • <strong>TORCS Backend:</strong> SCR-patched open racing car simulator communicating over UDP adapter.
              </p>
              <p>
                • <strong>Learner Lock:</strong> Changes to <code>learner/</code> are forbidden while a training run is active to prevent divergence.
              </p>
            </div>
            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full py-2 bg-[#19B8C9] text-black font-bold text-xs rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* All Models Modal with Mass Deletion and Zero Browser Prompts */}
      {showAllModelsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-[640px] bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] p-5 space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-[#1E2740] pb-2">
              <div>
                <span className="font-bold text-sm text-[#D7DEEC] uppercase">All Models Repository</span>
                <div className="text-[10px] text-[#7C88A6]">{models.length} stored neural architectures</div>
              </div>
              <button onClick={() => setShowAllModelsModal(false)} className="text-[#7C88A6] hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            {/* Mass Selection in Modal */}
            <div className="flex items-center justify-between text-xs py-1 px-2 bg-[#07090F] rounded-lg border border-[#1E2740]">
              <label className="flex items-center gap-1.5 text-[#7C88A6] cursor-pointer hover:text-[#D7DEEC]">
                <input
                  type="checkbox"
                  checked={models.length > 0 && models.every((m) => selectedModelIdsForDeletion.includes(m.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedModelIdsForDeletion(models.map((m) => m.id));
                    } else {
                      setSelectedModelIdsForDeletion([]);
                    }
                  }}
                  className="accent-[#19B8C9] cursor-pointer rounded"
                />
                <span>Select All ({models.length})</span>
              </label>

              {selectedModelIdsForDeletion.length > 0 && (
                <button
                  onClick={() => {
                    const names = models
                      .filter((m) => selectedModelIdsForDeletion.includes(m.id))
                      .map((m) => m.name);
                    setDeleteConfirmModal({
                      isOpen: true,
                      ids: selectedModelIdsForDeletion,
                      names
                    });
                  }}
                  className="px-2.5 py-1 rounded bg-[#FF4458]/20 border border-[#FF4458] text-[#FF4458] font-bold text-[10px] flex items-center gap-1 cursor-pointer hover:bg-[#FF4458]/30 shadow-[0_0_8px_rgba(255,68,88,0.2)]"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete Selected ({selectedModelIdsForDeletion.length})</span>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {models.map((m) => {
                const isChecked = selectedModelIdsForDeletion.includes(m.id);
                return (
                  <div key={m.id} className="p-3 rounded-xl bg-[#07090F] border border-[#1E2740] flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedModelIdsForDeletion((prev) => [...prev, m.id]);
                          } else {
                            setSelectedModelIdsForDeletion((prev) => prev.filter((id) => id !== m.id));
                          }
                        }}
                        className="accent-[#FF4458] cursor-pointer rounded"
                      />
                      <div>
                        <div className="font-bold text-xs text-[#D7DEEC]">{m.name}</div>
                        <div className="text-[10px] text-[#7C88A6]">{m.meta?.description || 'Custom Agent'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setExportToast(`Export package ready: models/${m.id} (arch.json + weights.bin)`);
                          setTimeout(() => setExportToast(null), 3500);
                        }}
                        className="p-1.5 rounded bg-[#121826] border border-[#1E2740] text-xs text-[#19B8C9] hover:bg-[#1E2740] cursor-pointer"
                        title="Export Model Package"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteConfirmModal({
                            isOpen: true,
                            ids: [m.id],
                            names: [m.name]
                          });
                        }}
                        className="p-1.5 rounded bg-[#FF4458]/20 border border-[#FF4458] text-xs text-[#FF4458] hover:bg-[#FF4458]/30 cursor-pointer"
                        title="Delete Model"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setShowAllModelsModal(false)}
              className="w-full py-2 bg-[#121826] border border-[#1E2740] text-[#D7DEEC] font-bold text-xs rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* In-UI Toast Notification for Export */}
      {exportToast && (
        <div className="fixed bottom-4 left-4 z-50 px-4 py-2.5 rounded-xl bg-[#19B8C9]/20 border border-[#19B8C9] text-[#19B8C9] text-xs font-bold shadow-2xl flex items-center gap-2">
          <span>✓ {exportToast}</span>
          <button onClick={() => setExportToast(null)} className="ml-2 text-white hover:text-[#19B8C9] cursor-pointer">✕</button>
        </div>
      )}

      {/* In-UI Custom Confirmation Prompt Modal for Deletion (No window.confirm!) */}
      {deleteConfirmModal?.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-[440px] bg-[#0D111A] border-2 border-[#FF4458] rounded-[14px] p-5 space-y-4 shadow-[0_0_30px_rgba(255,68,88,0.3)]">
            <div className="flex items-center justify-between border-b border-[#1E2740] pb-2 text-[#FF4458]">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span className="font-bold text-sm uppercase">Confirm Permanent Deletion</span>
              </div>
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="text-[#7C88A6] hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-[#D7DEEC] space-y-2">
              <p>
                Are you sure you want to permanently delete the following <strong>{deleteConfirmModal.ids.length}</strong> setup model(s)?
              </p>
              <div className="max-h-32 overflow-y-auto bg-[#07090F] p-2 rounded-xl border border-[#1E2740] space-y-1 text-[#7C88A6]">
                {deleteConfirmModal.names.map((name, i) => (
                  <div key={i} className="text-[#FF4458] font-bold truncate">• {name}</div>
                ))}
              </div>
              <p className="text-[10px] text-[#7C88A6]">
                This action removes neural weights, arch.json, and metadata from disk. This cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="flex-1 py-2 rounded-xl bg-[#121826] border border-[#1E2740] text-xs font-bold text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  for (const id of deleteConfirmModal.ids) {
                    try {
                      await fetch(`/api/models/${id}`, { method: 'DELETE' });
                    } catch (e) {
                      console.error(e);
                    }
                  }
                  await refreshModels();
                  setSelectedModelIdsForDeletion([]);
                  setDeleteConfirmModal(null);
                }}
                className="flex-1 py-2 rounded-xl bg-[#FF4458] text-white text-xs font-bold hover:bg-[#FF4458]/90 cursor-pointer shadow-[0_0_12px_rgba(255,68,88,0.4)]"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
