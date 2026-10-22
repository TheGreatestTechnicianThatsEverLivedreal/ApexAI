import React, { useMemo } from 'react';
import { useSim } from '../../context/SimContext.tsx';
import { SVGTrackMap } from '../common/SVGTrackMap.tsx';
import { CanvasChart } from '../common/CanvasChart.tsx';
import { SpeedMode } from '../../types/index.ts';
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
  RefreshCw
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
    models,
    selectedModelId,
    tracks,
    selectedTrackId,
    terminalLogs,
    highModeStatusLine
  } = useSim();

  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);
  const selectedModel = models.find((m) => m.id === selectedModelId);
  const trackMeta = selectedModel?.meta?.per_track?.[selectedTrack?.name || 'Silverstone GP'];
  const refAverage = trackMeta?.best_window_avg_s || 84.5;

  // Push laps only for telemetry charts
  const pushLaps = useMemo(() => {
    return lapHistory.filter((l) => l.lap_type === 'push');
  }, [lapHistory]);

  // Chart data sets
  const lapTimeData = useMemo(() => {
    return lapHistory.map((l) => ({
      lap: l.lap,
      value: l.time,
      lapType: l.lap_type
    }));
  }, [lapHistory]);

  const deltaData = useMemo(() => {
    return pushLaps.map((l) => ({
      lap: l.lap,
      value: l.delta,
      lapType: l.lap_type
    }));
  }, [pushLaps]);

  const tyreHealthData = useMemo(() => {
    return lapHistory.map((l) => ({
      lap: l.lap,
      value: l.tyre_health,
      lapType: l.lap_type
    }));
  }, [lapHistory]);

  const learnerMetricData = useMemo(() => {
    return pushLaps.map((l) => ({
      lap: l.lap,
      value: customMetrics[selectedLearnerMetric] !== undefined ? customMetrics[selectedLearnerMetric] : 0.05
    }));
  }, [pushLaps, customMetrics, selectedLearnerMetric]);

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

        {/* Live Terminal Log Stream */}
        <div className="flex-1 bg-[#05070B] border-2 border-[#1E2740] rounded-xl p-4 overflow-y-auto space-y-1 font-mono text-xs">
          <div className="text-[#7C88A6] pb-2 border-b border-[#1E2740]">
            ApexAI Core terminal stream (textual.print_every_laps = 50 | Failed laps count toward print):
          </div>
          {terminalLogs.map((log, i) => (
            <div key={i} className="text-[#D7DEEC]">
              {log}
            </div>
          ))}
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
    <div className={`flex-1 h-screen flex flex-col p-3 bg-[#07090F] overflow-hidden select-none relative ${
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
      <div className="flex-1 flex gap-3 min-h-0 mb-3">
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

        {/* Center SVG Track Map */}
        <div className="flex-1 min-w-0 h-full flex flex-col">
          <SVGTrackMap
            cars={cars}
            latestLap={latestLap}
            track={selectedTrack}
            runState={runState}
            onStart={startTraining}
          />
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
              <span className="text-[#7C88A6]" title="Circuit reference benchmark time (for delta calculation)">Target Benchmark:</span>
              <span className="text-[#FFC247] font-bold">{refAverage.toFixed(3)}s</span>
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

          {/* Governor Line */}
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
                <div className="font-bold text-[#D7DEEC]">{governor.workers > 0 ? governor.workers : '—'}</div>
              </div>
              <div className="p-1 rounded bg-[#121826] border border-[#1E2740]">
                <div className="text-[#7C88A6] text-[8px]">CPU</div>
                <div className="font-bold text-[#19B8C9]">{governor.cpu_pct > 0 ? `${governor.cpu_pct.toFixed(0)}%` : '0%'}</div>
              </div>
              <div className="p-1 rounded bg-[#121826] border border-[#1E2740]">
                <div className="text-[#7C88A6] text-[8px]">TEMP</div>
                <div className={`font-bold ${governor.temp_c > 80 ? 'text-[#FF4458]' : 'text-[#3DFF8F]'}`}>
                  {governor.temp_c > 0 ? `${governor.temp_c.toFixed(0)}°C` : '—'}
                </div>
              </div>
              <div className="p-1 rounded bg-[#121826] border border-[#1E2740]">
                <div className="text-[#7C88A6] text-[8px]">RAM</div>
                <div className="font-bold text-[#FFC247]">{governor.ram_pct > 0 ? `${governor.ram_pct.toFixed(0)}%` : '—'}</div>
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

      {/* Bottom Section: 4 Live Charts vs Lap */}
      <div className="h-44 shrink-0 grid grid-cols-4 gap-3">
        {/* Chart 1: Lap Time */}
        <CanvasChart
          title="Lap Time (Push Laps)"
          unit="s"
          data={lapTimeData}
          color="#3DFF8F"
          referenceLine={refAverage}
          colorByLapType={true}
        />

        {/* Chart 2: Delta */}
        <CanvasChart
          title="Delta vs Reference"
          unit="s"
          data={deltaData}
          color="#19B8C9"
          referenceLine={0.0}
        />

        {/* Chart 3: Tyre Health */}
        <CanvasChart
          title="Tyre Health"
          unit="%"
          data={tyreHealthData}
          color="#FFC247"
        />

        {/* Chart 4: Learner Metric with Metric Selector */}
        <div className="relative h-full flex flex-col">
          <div className="absolute top-2 right-3 z-10">
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
            data={learnerMetricData}
            color="#8B6CFF"
          />
        </div>
      </div>
    </div>
  );
};
