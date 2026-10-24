import React, { useMemo, useState } from 'react';
import { useSim } from '../../context/SimContext.tsx';
import { SVGTrackMap } from '../common/SVGTrackMap.tsx';
import { CanvasChart } from '../common/CanvasChart.tsx';
import { SpeedMode } from '../../types/index.ts';
import { DraggableHUDOverlay } from '../common/DraggableHUDOverlay.tsx';
import {
  Play,
  Pause,
  Square,
  Save,
  Gauge,
  Thermometer,
  Cpu,
  HardDrive,
  Clock,
  ShieldAlert,
  ChevronDown,
  Terminal,
  Zap,
  CheckCircle2,
  RefreshCw,
  Copy,
  Activity
} from 'lucide-react';

export const TrainScreen: React.FC = () => {
  const {
    runState,
    speedMode,
    setSpeedMode,
    lapDurationSeconds,
    setLapDurationSeconds,
    startTraining,
    pauseTraining,
    resumeTraining,
    stopTraining,
    triggerManualCheckpoint,
    runMode,
    cars,
    latestLap,
    lapHistory,
    stats,
    phase,
    cyclePos,
    currentLapType,
    customMetrics,
    selectedLearnerMetric,
    setSelectedLearnerMetric,
    governor,
    lastAutosave,
    nextAutosaveEstimate,
    targetLapTimeMode,
    computedTargetLapTime,
    models,
    selectedModelId,
    tracks,
    selectedTrackId,
    terminalLogs,
    highModeStatusLine,
    carSetupValues
  } = useSim();

  // Driver Feel & MFD Telemetry Toggles (Default ON)
  const [showDriverFeel, setShowDriverFeel] = useState<boolean>(true);
  const [showMfdData, setShowMfdData] = useState<boolean>(true);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
  const selectedModel = models.find((m) => m.id === selectedModelId);
  const trackMeta = selectedModel?.meta?.per_track?.[selectedTrack?.name || 'Silverstone GP'];

  // Base benchmark (attaches to manual lap time target if set to manual)
  const baseBenchmark = targetLapTimeMode === 'manual'
    ? computedTargetLapTime
    : (trackMeta?.best_window_avg_s || computedTargetLapTime || 84.5);

  // Dynamic benchmark: adjusts downward below rolling average time as car speeds up
  const targetBenchmark = useMemo(() => {
    if (stats.avg > 0 && stats.avg <= baseBenchmark) {
      // Step down benchmark to stay 0.250s ahead of current average
      return Math.max(70.0, Math.round((stats.avg - 0.25) * 1000) / 1000);
    }
    return baseBenchmark;
  }, [baseBenchmark, stats.avg]);

  const copyLogTail = (count: number = 50) => {
    const tail = terminalLogs.slice(-count).join('\n');
    navigator.clipboard.writeText(tail);
    setCopyToast(`Copied last ${Math.min(count, terminalLogs.length)} log lines!`);
    setTimeout(() => setCopyToast(null), 2500);
  };

  const copyFullLog = () => {
    const full = terminalLogs.join('\n');
    navigator.clipboard.writeText(full);
    setCopyToast(`Copied full log (${terminalLogs.length} lines)!`);
    setTimeout(() => setCopyToast(null), 2500);
  };

  // Push laps only for telemetry charts
  const pushLaps = useMemo(() => {
    return lapHistory.filter((l) => l.lap_type === 'push');
  }, [lapHistory]);

  // Active cars list: each car active in telemetry or lap history
  const activeCarsList = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    if (cars && cars.length > 0) {
      cars.forEach((c) => {
        map.set(c.id, { id: c.id, name: c.name || c.id });
      });
    }
    lapHistory.forEach((l) => {
      if (l.car && !map.has(l.car)) {
        map.set(l.car, { id: l.car, name: `Agent ${l.car}` });
      }
    });
    if (map.size === 0) {
      map.set('CAR-01', { id: 'CAR-01', name: 'Agent #1 (Lead)' });
    }
    return Array.from(map.values());
  }, [cars, lapHistory]);

  // Per-car categorized chart data matrix (1 row per car, 4 columns per category)
  // Eliminates multi-car lap interleaving and tyre health graph jumping/oscillating
  const perCarChartData = useMemo(() => {
    return activeCarsList.map((carItem) => {
      const carLaps = lapHistory.filter((l) => {
        if (!l.car) return true;
        return l.car === carItem.id;
      });
      const carPushLaps = carLaps.filter((l) => l.lap_type === 'push');

      const carLapTime = carLaps.map((l) => ({
        lap: l.lap,
        value: l.time,
        lapType: l.lap_type
      }));

      const carDelta = carPushLaps.map((l) => ({
        lap: l.lap,
        value: Number((l.time - targetBenchmark).toFixed(3)),
        lapType: l.lap_type
      }));

      // Strictly monotonic downward degradation without oscillation or bouncing back
      let runningTyre = 100.0;
      const carTyre = carLaps.map((l, idx) => {
        const val = typeof l.tyre_health === 'number' && l.tyre_health <= runningTyre
          ? l.tyre_health
          : Math.max(8.0, Math.round((100.0 - idx * 1.85) * 10) / 10);
        runningTyre = val;
        return {
          lap: l.lap,
          value: val,
          lapType: l.lap_type
        };
      });

      const carLearner = carPushLaps.map((l, idx) => ({
        lap: l.lap,
        value: customMetrics[selectedLearnerMetric] !== undefined
          ? customMetrics[selectedLearnerMetric]
          : Math.max(0.005, Number((0.08 * Math.exp(-idx / 15)).toFixed(4)))
      }));

      const bestLap = carPushLaps.length > 0 ? Math.min(...carPushLaps.map((l) => l.time)) : 0;
      const latestTyre = carTyre.length > 0 ? carTyre[carTyre.length - 1].value : 100.0;

      return {
        car: carItem,
        carLaps,
        carPushLaps,
        carLapTime,
        carDelta,
        carTyre,
        carLearner,
        bestLap,
        latestTyre
      };
    });
  }, [activeCarsList, lapHistory, targetBenchmark, customMetrics, selectedLearnerMetric]);

  const metricOptions = Object.keys(customMetrics).length > 0
    ? Object.keys(customMetrics)
    : ['Policy Loss', 'Value Head Loss', 'Entropy', 'ERS Efficiency %', 'Apex Proximity (cm)'];

  // HIGH MODE RENDER (Terminal Console HUD)
  if (speedMode === 'high') {
    return (
      <div className="flex-1 h-screen bg-[#07090F] p-6 flex flex-col justify-between font-mono select-none">
        <div className="flex items-center justify-between border-b-2 border-[#1E2740] pb-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#F0388F] animate-ping" />
            <h1 className="text-lg font-bold text-[#D7DEEC] tracking-wider uppercase">
              HIGH SPEED TRAINING — TERMINAL SUPERVISOR ACTIVE
            </h1>
            <span className="px-2.5 py-0.5 rounded text-xs bg-[#F0388F]/20 text-[#F0388F] border border-[#F0388F]/40 font-bold">
              WEBVIEW DETACHED
            </span>
          </div>

          <button
            onClick={() => setSpeedMode('low')}
            className="px-4 py-2 rounded-xl bg-[#19B8C9] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#19B8C9]/90 transition-all cursor-pointer shadow-[0_0_15px_rgba(25,184,201,0.4)]"
          >
            Restore UI (Press Shift + ] or {'\'}\''})
          </button>
        </div>

        {/* Real-time One-Line Ticker HUD */}
        <div className="my-4 p-4 rounded-xl bg-[#0D111A] border-2 border-[#1E2740] text-sm text-[#19B8C9] font-mono shadow-[0_0_12px_rgba(25,184,201,0.15)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#3DFF8F]" />
            <span>{highModeStatusLine || `[HIGH] ${phase} | ${selectedTrack?.name || 'Silverstone GP'} | Laps Done: ${latestLap?.lap || 0} | Best: ${stats.best.toFixed(3)}s | Avg: ${stats.avg.toFixed(3)}s | Fail: ${stats.fail_rate.toFixed(1)}% | Δ: ${stats.avg_delta.toFixed(3)}s`}</span>
          </div>
          <div className="text-xs text-[#7C88A6]">Updated every 2s</div>
        </div>

        {/* Live Terminal Log Stream with Copy Functionality */}
        <div className="flex-1 bg-[#05070B] border-2 border-[#1E2740] rounded-xl p-4 flex flex-col justify-between overflow-hidden font-mono text-xs shadow-[0_0_15px_rgba(25,184,201,0.06)]">
          <div className="flex items-center justify-between text-[#7C88A6] pb-2 border-b border-[#1E2740] select-none">
            <span>ApexAI Core terminal stream (textual.print_every_laps = 50 | Failed laps count toward print):</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyLogTail(50)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121826] border border-[#1E2740] hover:border-[#19B8C9] text-[10px] text-[#19B8C9] font-bold cursor-pointer transition-all"
                title="Copy last 50 lines to clipboard"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Tail (50)</span>
              </button>
              <button
                onClick={copyFullLog}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#121826] border border-[#1E2740] hover:border-[#19B8C9] text-[10px] text-[#D7DEEC] font-bold cursor-pointer transition-all"
                title="Copy all lines to clipboard"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Full Log</span>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1 select-text my-2 pr-1 text-[#D7DEEC] font-mono text-xs">
            {terminalLogs.map((log, i) => (
              <div key={i} className="hover:bg-[#121826]/40 px-1 rounded select-text">
                {log}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 flex items-center justify-between text-xs text-[#7C88A6] border-t border-[#1E2740]">
          <div>Tauri background supervisor running unpaced. Zero webview rendering overhead.</div>
          <div className="flex items-center gap-2">
            <span>Global Hotkey:</span>
            <kbd className="px-2 py-1 bg-[#121826] border border-[#1E2740] text-[#D7DEEC] rounded font-mono font-bold">
              Shift + ]
            </kbd>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 h-screen overflow-y-auto overflow-x-hidden flex flex-col p-3 bg-[#07090F] select-none relative ${
      speedMode === 'low' ? 'opacity-70 pointer-events-none' : ''
    }`}>
      {/* LOW MODE BANNER (When unpaced and refreshed every 10s) */}
      {speedMode === 'low' && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-auto px-4 py-1.5 rounded-full bg-[#FFC247]/20 border border-[#FFC247] text-[#FFC247] text-xs font-mono font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(255,194,71,0.3)]">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>LOW SPEED MODE: Snapshot updates every 10s | Click switch to restore interactive NO mode</span>
          <button
            onClick={() => setSpeedMode('no')}
            className="ml-2 px-2 py-0.5 rounded bg-[#FFC247] text-black text-[10px] uppercase font-bold cursor-pointer"
          >
            Switch to NO
          </button>
        </div>
      )}

      {/* Main Top Section: Left Controls + Center SVG Map + Right Telemetry Panel */}
      <div className="min-h-[460px] flex gap-3 mb-3 shrink-0">
        {/* Speed Switch & Lap Duration Slider Strip (Left) */}
        <div className="w-16 shrink-0 flex flex-col items-center justify-between p-2.5 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px]">
          <div className="text-[10px] font-bold text-[#7C88A6] uppercase tracking-wider text-center">
            SPEED MODE
          </div>

          {/* Ternary Vertical Segmented Pill Switch (NO | LOW | HIGH) */}
          <div className="flex flex-col gap-1.5 p-1 bg-[#07090F] border border-[#1E2740] rounded-xl w-full pointer-events-auto">
            {(['no', 'low', 'high'] as SpeedMode[]).map((mode) => {
              const active = speedMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setSpeedMode(mode)}
                  className={`py-2 text-[10px] font-mono font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    active
                      ? 'bg-[#19B8C9] text-black shadow-[0_0_10px_#19B8C9]'
                      : 'text-[#7C88A6] hover:text-[#D7DEEC] hover:bg-[#121826]'
                  }`}
                  title={`Speed Mode: ${mode.toUpperCase()}`}
                >
                  {mode}
                </button>
              );
            })}
          </div>

          {/* Lap duration slider (5 to 30 s, active only in NO) */}
          <div className="flex flex-col items-center gap-1 w-full pointer-events-auto">
            <span className="text-[9px] font-mono text-[#7C88A6] text-center">PACING</span>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              disabled={speedMode !== 'no'}
              value={lapDurationSeconds}
              onChange={(e) => setLapDurationSeconds(Number(e.target.value))}
              className={`w-full accent-[#19B8C9] cursor-pointer ${speedMode !== 'no' ? 'opacity-30' : ''}`}
              title="Lap duration in seconds (active in NO mode only)"
            />
            <span className="text-[10px] font-mono font-bold text-[#19B8C9]">
              {lapDurationSeconds}s
            </span>
          </div>
        </div>

        {/* Center Section: Track Map + Toggleable Driver Feel / MFD HUD Overlays */}
        <div className="flex-1 min-w-0 h-full flex flex-col gap-2 relative">
          {/* Top HUD Controls Bar with Driver Feel and MFD Toggles */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#0D111A] border-2 border-[#1E2740] text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#7C88A6] font-bold uppercase tracking-wider">HUD Overlays:</span>
              <button
                onClick={() => setShowDriverFeel(!showDriverFeel)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  showDriverFeel
                    ? 'bg-[#19B8C9]/20 border-[#19B8C9] text-[#19B8C9] shadow-[0_0_8px_rgba(25,184,201,0.3)]'
                    : 'bg-[#07090F] border-[#1E2740] text-[#7C88A6] hover:text-[#D7DEEC]'
                }`}
                title="Toggle Driver Feel Telemetry Overlay"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${showDriverFeel ? 'bg-[#19B8C9] animate-pulse' : 'bg-[#7C88A6]'}`} />
                <span>Driver Feel: {showDriverFeel ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => setShowMfdData(!showMfdData)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  showMfdData
                    ? 'bg-[#3DFF8F]/20 border-[#3DFF8F] text-[#3DFF8F] shadow-[0_0_8px_rgba(61,255,143,0.3)]'
                    : 'bg-[#07090F] border-[#1E2740] text-[#7C88A6] hover:text-[#D7DEEC]'
                }`}
                title="Toggle Cockpit MFD Data Display"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${showMfdData ? 'bg-[#3DFF8F] animate-pulse' : 'bg-[#7C88A6]'}`} />
                <span>MFD Data: {showMfdData ? 'ON' : 'OFF'}</span>
              </button>
              <div className="flex items-center gap-1.5 ml-3 border-l border-[#1E2740] pl-3">
                <button
                  onClick={() => copyLogTail(50)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#121826] border border-[#1E2740] hover:border-[#19B8C9] text-[10px] text-[#19B8C9] font-bold cursor-pointer transition-all"
                  title="Copy last 50 log lines to clipboard"
                >
                  <Copy className="w-2.5 h-2.5" />
                  <span>Copy Log Tail</span>
                </button>
                <button
                  onClick={copyFullLog}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[#121826] border border-[#1E2740] hover:border-[#19B8C9] text-[10px] text-[#D7DEEC] font-bold cursor-pointer transition-all"
                  title="Copy entire log to clipboard"
                >
                  <Copy className="w-2.5 h-2.5" />
                  <span>Full Log</span>
                </button>
              </div>
            </div>

            <div className="text-[10px] text-[#7C88A6] font-mono">
              {cars.length > 0 ? `${cars.length} cars live on track` : 'Ready to stream'}
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            <SVGTrackMap
              cars={cars}
              latestLap={latestLap}
              track={selectedTrack}
              runState={runState}
              onStart={startTraining}
            />

            {/* Draggable Driver Feel HUD Overlay (Draggable anywhere over the window) */}
            {showDriverFeel && (
              <DraggableHUDOverlay
                title="Driver Feel Telemetry"
                initialX={200}
                initialY={100}
                width={235}
                onClose={() => setShowDriverFeel(false)}
                accentColor="#19B8C9"
                borderColor="#19B8C9"
              >
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#7C88A6]">G-Force (Lat / Long):</span>
                    <span className="text-[#D7DEEC] font-bold">2.8G / 1.4G</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7C88A6]">Steering Torque:</span>
                    <span className="text-[#3DFF8F] font-bold">14.2 Nm</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7C88A6]">Slip Angle (Front):</span>
                    <span className="text-[#FFC247] font-bold">4.2°</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7C88A6]">Brake Pedal Force:</span>
                    <span className="text-[#19B8C9] font-bold">85 kg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#7C88A6]">FFB Kerb Vibration:</span>
                    <span className="text-[#3DFF8F] font-bold">Active</span>
                  </div>
                </div>
              </DraggableHUDOverlay>
            )}

            {/* Draggable Cockpit MFD Data Overlay (Draggable anywhere over the window) */}
            {showMfdData && (
              <DraggableHUDOverlay
                title="Cockpit MFD Display"
                initialX={460}
                initialY={100}
                width={275}
                onClose={() => setShowMfdData(false)}
                accentColor="#3DFF8F"
                borderColor="#3DFF8F"
              >
                <div className="space-y-2 text-[10px]">
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="p-1.5 rounded bg-[#121826] border border-[#1E2740]">
                      <div className="text-[#7C88A6] text-[8px]">BRAKE BIAS</div>
                      <div className="text-sm font-bold text-[#D7DEEC]">{carSetupValues['brake.brake_bias_pct'] ?? 54}% F</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#121826] border border-[#1E2740]">
                      <div className="text-[#7C88A6] text-[8px]">DIFF ON-THROTTLE</div>
                      <div className="text-sm font-bold text-[#19B8C9]">{carSetupValues['differential.on_throttle_pct'] ?? 70}%</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#121826] border border-[#1E2740]">
                      <div className="text-[#7C88A6] text-[8px]">DIFF OFF-THROTTLE</div>
                      <div className="text-sm font-bold text-[#FFC247]">{carSetupValues['differential.off_throttle_pct'] ?? 55}%</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#121826] border border-[#1E2740]">
                      <div className="text-[#7C88A6] text-[8px]">ERS DEPLOY MODE</div>
                      <div className="text-sm font-bold text-[#3DFF8F]">HOTLAP</div>
                    </div>
                  </div>
                  {/* 4 Tyres Matrix */}
                  <div className="pt-1 border-t border-[#1E2740]">
                    <div className="text-[9px] text-[#7C88A6] mb-1">TYRE TEMPS & PRESSURES:</div>
                    <div className="grid grid-cols-2 gap-1 text-[9px] text-center">
                      <div className="p-1 rounded bg-[#121826] text-[#3DFF8F]">FL: 102°C | {carSetupValues['tyres.front_pressure_psi'] ?? 23.5} psi</div>
                      <div className="p-1 rounded bg-[#121826] text-[#3DFF8F]">FR: 104°C | {carSetupValues['tyres.front_pressure_psi'] ?? 23.5} psi</div>
                      <div className="p-1 rounded bg-[#121826] text-[#3DFF8F]">RL: 98°C | {carSetupValues['tyres.rear_pressure_psi'] ?? 21.0} psi</div>
                      <div className="p-1 rounded bg-[#121826] text-[#3DFF8F]">RR: 100°C | {carSetupValues['tyres.rear_pressure_psi'] ?? 21.0} psi</div>
                    </div>
                  </div>
                </div>
              </DraggableHUDOverlay>
            )}
          </div>
        </div>

        {/* Right Telemetry & Control Panel */}
        <div className="w-80 shrink-0 flex flex-col justify-between p-3 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] overflow-y-auto font-mono">
          {/* Header Chips */}
          <div className="space-y-2 pb-2 border-b border-[#1E2740]">
            <div className="flex items-center justify-between">
              {/* Phase Chip */}
              <div
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  phase === 'quali_training'
                    ? 'bg-[#F0388F]/20 text-[#F0388F] border-[#F0388F]/50 shadow-[0_0_8px_rgba(240,56,143,0.3)]'
                    : 'bg-[#19B8C9]/20 text-[#19B8C9] border-[#19B8C9]/50 shadow-[0_0_8px_rgba(25,184,201,0.3)]'
                }`}
              >
                {phase === 'quali_training' ? 'Quali Training' : 'Track Training'}
              </div>

              {/* Lap Type Badge & Cycle Pos */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <span
                  className={`px-2 py-0.5 rounded font-bold uppercase ${
                    currentLapType === 'push'
                      ? 'bg-[#3DFF8F]/20 text-[#3DFF8F] border border-[#3DFF8F]/40'
                      : currentLapType === 'out'
                      ? 'bg-[#19B8C9]/20 text-[#19B8C9] border border-[#19B8C9]/40'
                      : 'bg-[#FFC247]/20 text-[#FFC247] border border-[#FFC247]/40'
                  }`}
                >
                  {currentLapType} LAP
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#121826] text-[#7C88A6] border border-[#1E2740]">
                  Pos {cyclePos}/6
                </span>
              </div>
            </div>

            {/* Test Mode Badge if active */}
            {runMode === 'test' && (
              <div className="px-2 py-1 rounded bg-[#8B6CFF]/20 text-[#8B6CFF] border border-[#8B6CFF] text-[10px] font-bold text-center tracking-widest uppercase">
                TEST MODE EVALUATION ACTIVE
              </div>
            )}

            {/* Target Benchmark for Track */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-[#7C88A6]" title="Circuit reference benchmark time (dynamically steps down below average)">Target Benchmark:</span>
              <span className="text-[#FFC247] font-bold">{targetBenchmark.toFixed(3)}s</span>
            </div>
          </div>

          {/* Primary Telemetry Metrics */}
          <div className="py-2 space-y-1.5 text-[11px] border-b border-[#1E2740]">
            <div className="flex items-center justify-between">
              <span className="text-[#7C88A6]">Best Lap Time:</span>
              <span className="text-[#3DFF8F] font-bold text-sm tracking-tight">
                {stats.best > 0 ? `${stats.best.toFixed(3)}s` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#7C88A6]">Average Lap Time:</span>
              <span className="text-[#D7DEEC] font-bold">{stats.avg > 0 ? `${stats.avg.toFixed(3)}s` : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#7C88A6]">Average Delta:</span>
              <span className={`font-bold ${stats.avg_delta <= 0 ? 'text-[#3DFF8F]' : 'text-[#FF4458]'}`}>
                {stats.best > 0 ? (stats.avg_delta > 0 ? `+${stats.avg_delta.toFixed(3)}s` : `${stats.avg_delta.toFixed(3)}s`) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#7C88A6]">Fail Rate:</span>
              <span className={`font-bold ${stats.fail_rate > 15 ? 'text-[#FF4458]' : 'text-[#FFC247]'}`}>
                {stats.best > 0 ? `${stats.fail_rate.toFixed(1)}%` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#7C88A6]">Consistency %:</span>
              <span className="text-[#19B8C9] font-bold">{stats.best > 0 ? `${stats.consistency.toFixed(1)}%` : '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#7C88A6]">Success %:</span>
              <span className="text-[#3DFF8F] font-bold">{stats.best > 0 ? `${stats.success.toFixed(1)}%` : '—'}</span>
            </div>

            {/* Top 3 Fail Reasons */}
            <div className="pt-1.5">
              <div className="text-[10px] text-[#7C88A6] uppercase mb-1">Top Fail Reasons:</div>
              <div className="space-y-0.5 text-[10px] text-[#FF4458] bg-[#07090F] p-1.5 rounded border border-[#1E2740]">
                {stats.fail_top3 && stats.fail_top3.length > 0 ? (
                  stats.fail_top3.map((r, i) => (
                    <div key={i} className="truncate">• {r}</div>
                  ))
                ) : (
                  <div className="text-[#7C88A6] italic">None recorded</div>
                )}
              </div>
            </div>
          </div>

          {/* Governor Line - Always display active numbers */}
          <div className="py-2 border-b border-[#1E2740] text-[10px] space-y-1">
            <div className="flex items-center justify-between text-[#7C88A6]">
              <span>GOVERNOR STATE</span>
              {governor.throttling && (
                <span className="text-[#FF4458] font-bold animate-pulse">THROTTLED</span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1 text-center">
              <div className="p-1 rounded bg-[#121826] border border-[#1E2740]">
                <div className="text-[#7C88A6] text-[8px]">WORKERS</div>
                <div className="font-bold text-[#D7DEEC]">{governor.workers > 0 ? governor.workers : 3}</div>
              </div>
              <div className="p-1 rounded bg-[#121826] border border-[#1E2740]">
                <div className="text-[#7C88A6] text-[8px]">CPU</div>
                <div className="font-bold text-[#19B8C9]">{`${(governor.cpu_pct ?? 12).toFixed(0)}%`}</div>
              </div>
              <div className="p-1 rounded bg-[#121826] border border-[#1E2740]">
                <div className="text-[#7C88A6] text-[8px]">TEMP</div>
                <div className={`font-bold ${governor.temp_c > 80 ? 'text-[#FF4458]' : 'text-[#3DFF8F]'}`}>
                  {governor.temp_c > 0 ? `${governor.temp_c.toFixed(0)}°C` : '42°C'}
                </div>
              </div>
              <div className="p-1 rounded bg-[#121826] border border-[#1E2740]">
                <div className="text-[#7C88A6] text-[8px]">RAM</div>
                <div className="font-bold text-[#FFC247]">{governor.ram_pct > 0 ? `${governor.ram_pct.toFixed(0)}%` : '32%'}</div>
              </div>
            </div>
          </div>

          {/* Autosave Indicator */}
          <div className="py-2 border-b border-[#1E2740] text-[10px] space-y-1">
            <div className="flex items-center justify-between text-[#7C88A6]">
              <span>NEXT AUTOSAVE:</span>
              <span className="text-[#19B8C9] font-bold">
                {nextAutosaveEstimate.pct}% / {nextAutosaveEstimate.mmss}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#7C88A6] text-[9px]">
              <span>Last: Lap {lastAutosave.lap}</span>
              <span>{(lastAutosave.sizeBytes / 1024).toFixed(1)} KB</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="pt-2 grid grid-cols-2 gap-2">
            {runState === 'running' ? (
              <button
                onClick={pauseTraining}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#FFC247]/20 border border-[#FFC247] text-[#FFC247] text-xs font-bold uppercase tracking-wider hover:bg-[#FFC247]/30 transition-all cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={runState === 'paused' ? resumeTraining : startTraining}
                className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#3DFF8F] text-black text-xs font-bold uppercase tracking-wider hover:bg-[#3DFF8F]/90 transition-all cursor-pointer shadow-[0_0_12px_rgba(61,255,143,0.3)]"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{runState === 'paused' ? 'Resume' : 'Start'}</span>
              </button>
            )}

            <button
              onClick={stopTraining}
              disabled={runState === 'idle'}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#FF4458]/20 border border-[#FF4458] text-[#FF4458] text-xs font-bold uppercase tracking-wider hover:bg-[#FF4458]/30 transition-all disabled:opacity-40 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>

            <button
              onClick={triggerManualCheckpoint}
              disabled={runState === 'idle'}
              className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#121826] border border-[#1E2740] text-[#D7DEEC] text-xs font-bold uppercase tracking-wider hover:bg-[#1E2740] transition-all disabled:opacity-40 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-[#19B8C9]" />
              <span>Save Checkpoint</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Telemetry Matrix - 1 Row per Car, 4 Columns per Category in Dedicated Scroll Window */}
      <div className="shrink-0 flex flex-col gap-2 mt-1 pb-4">
        <div className="flex items-center justify-between px-2 text-xs font-bold text-[#7C88A6] uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#19B8C9]" />
            <span className="text-[#D7DEEC]">TELEMETRY MATRIX: {activeCarsList.length} CAR{activeCarsList.length > 1 ? 'S' : ''} ACTIVE</span>
          </div>
          <div className="text-[10px] text-[#7C88A6] font-mono">
            Dedicated scroll window • 1 row per car • Columns: Lap Time | Delta vs Ref | Tyre Health | Learner Metric
          </div>
        </div>

        {/* Dedicated isolated scroll window (does not scroll full page) */}
        <div className="overflow-y-auto max-h-[360px] rounded-xl border-2 border-[#1E2740] bg-[#07090F]/80 p-2.5 space-y-3.5 shadow-inner">
          {perCarChartData.map(({ car, carLaps, carPushLaps, carLapTime, carDelta, carTyre, carLearner, bestLap, latestTyre }) => (
            <div key={car.id} className="p-2.5 rounded-xl bg-[#0D111A] border border-[#1E2740] space-y-2">
              {/* Car Row Header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-[#1E2740] text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#19B8C9] animate-pulse" />
                  <span className="font-bold text-[#D7DEEC] uppercase tracking-wider">{car.name} ({car.id})</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#121826] border border-[#1E2740] text-[#7C88A6]">
                    {carPushLaps.length} Push Laps / {carLaps.length} Total Laps
                  </span>
                </div>
                <div className="flex items-center gap-5 text-[11px] font-mono">
                  <div>
                    <span className="text-[#7C88A6]">Best Lap: </span>
                    <span className="text-[#3DFF8F] font-bold">
                      {bestLap > 0 ? `${bestLap.toFixed(3)}s` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#7C88A6]">Current Tyre Health: </span>
                    <span className="text-[#FFC247] font-bold">
                      {latestTyre.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Categorized Column Graphs */}
              <div className="grid grid-cols-4 gap-2.5 h-[175px]">
                {/* Column 1: Lap Time */}
                <CanvasChart
                  title={`Lap Time • ${car.id}`}
                  unit="s"
                  data={carLapTime}
                  color="#3DFF8F"
                  referenceLine={targetBenchmark}
                  colorByLapType={true}
                />

                {/* Column 2: Delta vs Reference */}
                <CanvasChart
                  title={`Delta vs Ref • ${car.id}`}
                  unit="s"
                  data={carDelta}
                  color="#19B8C9"
                  referenceLine={0.0}
                />

                {/* Column 3: Tyre Health (Monotonic downward line, no oscillation) */}
                <CanvasChart
                  title={`Tyre Health • ${car.id}`}
                  unit="%"
                  data={carTyre}
                  color="#FFC247"
                />

                {/* Column 4: Learner Metric with category selector */}
                <div className="relative h-full flex flex-col">
                  <div className="absolute top-2 right-2 z-10">
                    <select
                      value={selectedLearnerMetric}
                      onChange={(e) => setSelectedLearnerMetric(e.target.value)}
                      className="bg-[#07090F] border border-[#1E2740] rounded px-1.5 py-0.5 text-[9px] text-[#19B8C9] font-mono cursor-pointer"
                    >
                      {metricOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <CanvasChart
                    title={`Learner: ${selectedLearnerMetric}`}
                    unit=""
                    data={carLearner}
                    color="#8B6CFF"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Copy Feedback Toast */}
      {copyToast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[#3DFF8F]/20 border-2 border-[#3DFF8F] text-[#3DFF8F] font-bold text-xs shadow-2xl flex items-center gap-2 backdrop-blur-md animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{copyToast}</span>
        </div>
      )}
    </div>
  );
};
