import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  ScreenId,
  SpeedMode,
  RunState,
  TrainingPhase,
  LapType,
  ParamDefinition,
  CustomParam,
  CarTelemetry,
  LapCompleteEvent,
  PushStats,
  GovernorState,
  PastModel,
  TrackData
} from '../types/index.ts';
import { evaluateSafeExpression, validateParams, ValidationWarning } from '../utils/engineUtils.ts';

interface SimContextType {
  // Navigation
  activeScreen: ScreenId;
  previousScreen: ScreenId;
  navigateTo: (screen: ScreenId) => void;

  // Run & Speed Orchestration
  runState: RunState;
  speedMode: SpeedMode;
  setSpeedMode: (mode: SpeedMode) => void;
  lapDurationSeconds: number;
  setLapDurationSeconds: (s: number) => void;
  isDemoMode: boolean;
  setIsDemoMode: (demo: boolean) => void;
  startTraining: () => Promise<void>;
  pauseTraining: () => Promise<void>;
  resumeTraining: () => Promise<void>;
  stopTraining: () => Promise<void>;
  triggerManualCheckpoint: () => Promise<void>;

  // Learner lock
  isLearnerLocked: boolean;
  learnerHash: string;

  // Telemetry & Stats
  cars: CarTelemetry[];
  latestLap: LapCompleteEvent | null;
  lapHistory: LapCompleteEvent[];
  stats: PushStats;
  phase: TrainingPhase;
  cyclePos: number;
  currentLapType: LapType;
  customMetrics: Record<string, number>;
  selectedLearnerMetric: string;
  setSelectedLearnerMetric: (name: string) => void;

  // Governor & Autosave
  governor: GovernorState;
  lastAutosave: { time: number; lap: number; sizeBytes: number; reason: string };
  nextAutosaveEstimate: { pct: number; mmss: string };

  // Setup Screen State
  trainingStyle: 'lap_time' | 'race';
  setTrainingStyle: (s: 'lap_time' | 'race') => void;
  isDefaultStyle: boolean;
  setIsDefaultStyle: (d: boolean) => void;
  smoothAggressive: 'off' | 'smooth' | 'aggressive';
  setSmoothAggressive: (val: 'off' | 'smooth' | 'aggressive') => void;
  oversteerUndersteer: 'off' | 'oversteer' | 'understeer';
  setOversteerUndersteer: (val: 'off' | 'oversteer' | 'understeer') => void;
  physicsToggles: Record<string, boolean>;
  setPhysicsToggle: (key: string, val: boolean) => void;
  simBackend: 'custom' | 'torcs';
  setSimBackend: (b: 'custom' | 'torcs') => void;
  runMode: 'train' | 'test';
  setRunMode: (m: 'train' | 'test') => void;
  carCount: number;
  setCarCount: (c: number) => void;
  targetLaps: number;
  setTargetLaps: (laps: number) => void;
  targetLapTimeMode: 'carry_over' | 'manual';
  setTargetLapTimeMode: (m: 'carry_over' | 'manual') => void;
  manualTargetTime: string;
  setManualTargetTime: (t: string) => void;
  computedTargetLapTime: number;

  // Models & Tracks
  models: PastModel[];
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  testModelIds: string[];
  toggleTestModelId: (id: string) => void;
  tracks: TrackData[];
  selectedTrackId: string;
  setSelectedTrackId: (id: string) => void;
  refreshModels: () => Promise<void>;
  refreshTracks: () => Promise<void>;
  deleteTrack: (id: string) => Promise<boolean>;

  // Params (Rewards & Values)
  paramsSchema: ParamDefinition[];
  paramValues: Record<string, any>;
  customParams: CustomParam[];
  modifiedKeys: Set<string>;
  setParamValue: (key: string, value: any) => void;
  resetParamToDefault: (key: string) => void;
  resetAllParams: () => void;
  applyHotParam: (key: string) => void;
  addCustomParam: (param: CustomParam) => void;
  removeCustomParam: (key: string) => void;
  validationWarnings: ValidationWarning[];

  // Car Setup parameters
  carSetupValues: Record<string, number>;
  setCarSetupValue: (tab: string, param: string, val: number) => void;
  resetCarSetupTab: (tab: string) => void;

  // Unclean shutdown
  uncleanShutdown: boolean;
  resumeLastRun: () => Promise<void>;
  dismissUncleanNotice: () => void;

  // Terminal Logs for HIGH mode & stdout
  terminalLogs: string[];
  highModeStatusLine: string;
  emittedChecklist: string[];
  wsConnected: boolean;
}

const SimContext = createContext<SimContextType | null>(null);

export const SimProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation
  const [activeScreen, setActiveScreen] = useState<ScreenId>(() => {
    return (localStorage.getItem('apex_active_screen') as ScreenId) || 'train';
  });
  const [previousScreen, setPreviousScreen] = useState<ScreenId>('setup');

  const navigateTo = (screen: ScreenId) => {
    setPreviousScreen(activeScreen);
    setActiveScreen(screen);
    localStorage.setItem('apex_active_screen', screen);
  };

  // Run & Orchestration
  const [runState, setRunState] = useState<RunState>('idle');
  const [speedMode, setSpeedModeState] = useState<SpeedMode>('no');
  const [lapDurationSeconds, setLapDurationSecondsState] = useState<number>(15.0);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isLearnerLocked, setIsLearnerLocked] = useState<boolean>(false);
  const [learnerHash, setLearnerHash] = useState<string>('');

  // Unclean shutdown detection
  const [uncleanShutdown, setUncleanShutdown] = useState<boolean>(false);

  // Telemetry & Stats (Starts at 0 until learner actually emits push lap data)
  const [cars, setCars] = useState<CarTelemetry[]>([]);
  const [latestLap, setLatestLap] = useState<LapCompleteEvent | null>(null);
  const [lapHistory, setLapHistory] = useState<LapCompleteEvent[]>([]);
  const [stats, setStats] = useState<PushStats>({
    best: 0,
    avg: 0,
    fail_rate: 0,
    fail_top3: [],
    avg_delta: 0,
    consistency: 0,
    success: 0
  });
  const [phase, setPhase] = useState<TrainingPhase>('track_training');
  const [cyclePos, setCyclePos] = useState<number>(1);
  const [currentLapType, setCurrentLapType] = useState<LapType>('out');
  const [customMetrics, setCustomMetrics] = useState<Record<string, number>>({});
  const [selectedLearnerMetric, setSelectedLearnerMetric] = useState<string>('Policy Loss');

  // Governor & Autosave (Reports real system telemetry from supervisor)
  const [governor, setGovernor] = useState<GovernorState>({
    workers: 3,
    cpu_pct: 12,
    temp_c: 45,
    ram_pct: 32,
    throttling: false,
    on_battery: false
  });
  const [lastAutosave, setLastAutosave] = useState({
    time: Date.now() - 60000,
    lap: 0,
    sizeBytes: 0,
    reason: 'none'
  });

  // Setup state
  const [trainingStyle, setTrainingStyle] = useState<'lap_time' | 'race'>('lap_time');
  const [isDefaultStyle, setIsDefaultStyle] = useState<boolean>(false);
  const [smoothAggressive, setSmoothAggressive] = useState<'off' | 'smooth' | 'aggressive'>('smooth');
  const [oversteerUndersteer, setOversteerUndersteer] = useState<'off' | 'oversteer' | 'understeer'>('off');
  const [physicsToggles, setPhysicsToggles] = useState<Record<string, boolean>>({
    advanced_aero: true,
    advanced_ers: true,
    tyre_health: true,
    tyre_grip: true,
    tyre_thermals: true,
    custom_setups: true,
    noise_level: false,
    fuel_weight: true,
    fuel_mixes: true,
    brake_thermals: true,
    brake_pressure: true,
    brake_bias: true,
    differential: true,
    random_tyre: false,
    wet_surfaces: false
  });
  const [simBackend, setSimBackend] = useState<'custom' | 'torcs'>('custom');
  const [runMode, setRunMode] = useState<'train' | 'test'>('train');
  const [carCount, setCarCount] = useState<number>(2);
  const [targetLaps, setTargetLaps] = useState<number>(1000);
  const [targetLapTimeMode, setTargetLapTimeMode] = useState<'carry_over' | 'manual'>('carry_over');
  const [manualTargetTime, setManualTargetTime] = useState<string>('01:24.500');

  // Models and Tracks
  const [models, setModels] = useState<PastModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('apex_v1_baseline');
  const [testModelIds, setTestModelIds] = useState<string[]>(['apex_v1_baseline', 'apex_v2_aerodynamic']);
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('silverstone_gp');

  // Schema & Param Values
  const [paramsSchema, setParamsSchema] = useState<ParamDefinition[]>([]);
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const [defaultParamValues, setDefaultParamValues] = useState<Record<string, any>>({});
  const [customParams, setCustomParams] = useState<CustomParam[]>([]);
  const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
  const [appliedHotKeys, setAppliedHotKeys] = useState<Set<string>>(new Set());

  // Car Setup parameters (F1 2020 layout)
  const [carSetupValues, setCarSetupValues] = useState<Record<string, number>>({
    'suspension.front_springs': 8,
    'suspension.rear_springs': 6,
    'suspension.front_bump': 5,
    'suspension.rear_bump': 4,
    'tyres.front_pressure_psi': 23.5,
    'tyres.rear_pressure_psi': 21.0,
    'arb.front_anti_roll_bar': 7,
    'arb.rear_anti_roll_bar': 5,
    'ride_height.front': 3,
    'ride_height.rear': 6,
    'wings.front_wing': 7,
    'wings.rear_wing': 8,
    'fuel.initial_load_kg': 12.5,
    'differential.on_throttle_pct': 70,
    'differential.off_throttle_pct': 55,
    'brake.brake_pressure_pct': 95,
    'brake.brake_bias_pct': 54,
    'toe_camber.front_camber_deg': -2.8,
    'toe_camber.rear_camber_deg': -1.4,
    'toe_camber.front_toe_deg': 0.08,
    'toe_camber.rear_toe_deg': 0.24,
  });

  // Terminal & Logs
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '[INIT] ApexAI Supervisor initialized on 127.0.0.1:8765'
  ]);
  const [highModeStatusLine, setHighModeStatusLine] = useState<string>('');
  const [emittedChecklist, setEmittedChecklist] = useState<string[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);

  // Compute target lap time from expression
  const selectedTrack = tracks.find(t => t.id === selectedTrackId);
  const selectedModel = models.find(m => m.id === selectedModelId);
  const trackStats = selectedModel?.meta?.per_track?.[selectedTrack?.name || 'Silverstone GP'];

  const computedTargetLapTime = React.useMemo(() => {
    if (targetLapTimeMode === 'manual') {
      const parts = manualTargetTime.split(':');
      if (parts.length === 2) {
        return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      }
      return parseFloat(manualTargetTime) || 84.5;
    }
    const expr = paramValues['target.carry_over_expr'] || 'last_best_avg';
    const scope = {
      last_target: trackStats?.last_target_s || 85.0,
      last_best_avg: trackStats?.best_window_avg_s || 84.5,
      last_best_lap: trackStats?.last_best_s || 84.0
    };
    return evaluateSafeExpression(expr, scope);
  }, [targetLapTimeMode, manualTargetTime, paramValues, trackStats]);

  // Load Schema and Defaults from Server
  useEffect(() => {
    fetch('/api/schema')
      .then(res => res.json())
      .then(data => {
        if (data.schema?.parameters) {
          setParamsSchema(data.schema.parameters);
        }
        if (data.defaults) {
          setDefaultParamValues(data.defaults);
          setParamValues(data.defaults);
          if (data.defaults.custom) {
            setCustomParams(data.defaults.custom);
          }
        }
      })
      .catch(e => console.error('Error fetching schema:', e));

    refreshModels();
    refreshTracks();
  }, []);

  const refreshModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(data);
    } catch (e) {
      console.error('Error fetching models:', e);
    }
  };

  const refreshTracks = async () => {
    try {
      const res = await fetch('/api/tracks');
      const data = await res.json();
      setTracks(data);
    } catch (e) {
      console.error('Error fetching tracks:', e);
    }
  };

  const deleteTrack = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tracks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshTracks();
        if (selectedTrackId === id) {
          setSelectedTrackId('silverstone_gp');
        }
        return true;
      }
    } catch (e) {
      console.error('Error deleting track:', e);
    }
    return false;
  };

  // Connect WebSocket to Supervisor
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const connect = () => {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        console.log('[CLIENT WS] Connected to Core Supervisor');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleWsMessage(msg);
        } catch (e) {
          console.error('[CLIENT WS] Parse error:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        // Reconnect after 2s
        setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        setWsConnected(false);
      };
    };

    connect();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleWsMessage = useCallback((msg: any) => {
    const type = msg.type || '';
    setEmittedChecklist(prev => prev.includes(type) ? prev : [...prev, type]);

    if (type === 'core_state') {
      if (msg.run_state) {
        setRunState(msg.run_state);
        setIsLearnerLocked(msg.run_state !== 'idle');
      }
      if (msg.mode) setSpeedModeState(msg.mode);
      if (msg.speed_lap_seconds) setLapDurationSecondsState(msg.speed_lap_seconds);
      if (msg.unclean_shutdown) setUncleanShutdown(true);
      if (msg.last_autosave) setLastAutosave(msg.last_autosave);
      if (msg.emitted_types) setEmittedChecklist(msg.emitted_types);
    } else if (type === 'frame') {
      // High-frequency car frame
      if (Array.isArray(msg.cars)) {
        setCars(msg.cars);
      }
    } else if (type === 'lap_complete') {
      setLatestLap(msg);
      setCyclePos(msg.cycle_pos || 1);
      setCurrentLapType(msg.lap_type || 'push');
      setLapHistory(prev => {
        const next = [...prev, msg];
        return next.slice(-200); // 200 window history
      });
      // Monotonic Best Lap: if it is a successful push lap, check if it beats current best
      if (msg.lap_type === 'push' && !msg.crash && msg.time > 0) {
        setStats(prev => ({
          ...prev,
          best: prev.best === 0 || msg.time < prev.best ? msg.time : prev.best
        }));
      }
    } else if (type === 'stats') {
      setStats(prev => {
        // Enforce that best lap is strictly the fastest recorded push lap (never slower)
        let resolvedBest = prev.best;
        if (msg.best && msg.best > 0) {
          if (resolvedBest === 0 || msg.best < resolvedBest) {
            resolvedBest = msg.best;
          }
        }
        return {
          best: resolvedBest,
          avg: msg.avg || prev.avg,
          fail_rate: msg.fail_rate ?? prev.fail_rate,
          fail_top3: msg.fail_top3 || prev.fail_top3,
          avg_delta: msg.avg_delta ?? prev.avg_delta,
          consistency: msg.consistency ?? prev.consistency,
          success: msg.success ?? prev.success
        };
      });
      // High mode status line
      const line = `[HIGH] Best: ${msg.best?.toFixed(3)}s | Avg: ${msg.avg?.toFixed(3)}s | Fail: ${msg.fail_rate?.toFixed(1)}% | Δ: ${msg.avg_delta > 0 ? '+' : ''}${msg.avg_delta?.toFixed(3)}s | Consist: ${msg.consistency?.toFixed(1)}%`;
      setHighModeStatusLine(line);
    } else if (type === 'metrics') {
      if (msg.metrics) {
        setCustomMetrics(msg.metrics);
      }
    } else if (type === 'phase') {
      setPhase(msg.phase);
    } else if (type === 'set_mode') {
      setSpeedModeState(msg.mode);
    } else if (type === 'set_speed') {
      setLapDurationSecondsState(msg.lap_seconds);
    } else if (type === 'log') {
      setTerminalLogs(prev => [...prev.slice(-300), `[${msg.source || 'SYS'}] ${msg.text}`]);
    } else if (type === 'autosave_updated') {
      if (msg.last_autosave) setLastAutosave(msg.last_autosave);
    } else if (type === 'tracks_updated') {
      refreshTracks();
    } else if (type === 'status' && msg.status === 'done') {
      setRunState('idle');
      setIsLearnerLocked(false);
    }
  }, []);

  // Hotkey listener for '}' or Shift + ] to restore LOW mode from HIGH mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '}' || (e.shiftKey && e.key === ']')) {
        console.log('[HOTKEY] Restoring UI in LOW mode');
        setSpeedMode('low');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Real Telemetry Polling (Runs every 150ms while running, 1000ms when idle)
  // Ensures telemetry, cars, laps, and real governor stats stream even if WebSocket proxy drops
  useEffect(() => {
    let isMounted = true;
    const intervalMs = runState === 'running' ? 150 : 1000;

    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/telemetry');
        if (!res.ok || !isMounted) return;
        const data = await res.json();
        if (data.governor) setGovernor(data.governor);
        if (data.run_state && data.run_state !== runState) {
          setRunState(data.run_state);
          setIsLearnerLocked(data.run_state !== 'idle');
        }
        if (Array.isArray(data.cars) && data.cars.length > 0) {
          setCars(data.cars);
        }
        if (data.latest_lap) setLatestLap(data.latest_lap);
        if (Array.isArray(data.lap_history) && data.lap_history.length > 0) {
          setLapHistory(data.lap_history);
        }
        if (data.stats && data.stats.best > 0) {
          setStats(prev => {
            let resolvedBest = prev.best;
            if (resolvedBest === 0 || data.stats.best < resolvedBest) {
              resolvedBest = data.stats.best;
            }
            return {
              ...data.stats,
              best: resolvedBest
            };
          });
        }
        if (data.phase) setPhase(data.phase);
        if (data.cycle_pos) setCyclePos(data.cycle_pos);
        if (data.lap_type) setCurrentLapType(data.lap_type);
        if (data.custom_metrics) setCustomMetrics(data.custom_metrics);
        if (data.last_autosave) setLastAutosave(data.last_autosave);
        if (Array.isArray(data.logs) && data.logs.length > 0) {
          setTerminalLogs(data.logs);
        }
      } catch (e) {
        // Ignore network polling error
      }
    };

    const timer = setInterval(fetchTelemetry, intervalMs);
    fetchTelemetry();

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [runState]);

  // Set speed mode via REST and WS
  const setSpeedMode = async (mode: SpeedMode) => {
    setSpeedModeState(mode);
    try {
      await fetch('/api/run/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
    } catch (e) {}
  };

  const setLapDurationSeconds = async (seconds: number) => {
    setLapDurationSecondsState(seconds);
    try {
      await fetch('/api/run/speed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lap_seconds: seconds })
      });
    } catch (e) {}
  };

  // Start Training Run
  const startTraining = async () => {
    const runConfig = {
      run: {
        mode: runMode,
        model_id: selectedModelId,
        test_models: runMode === 'test' ? testModelIds : [selectedModelId],
        count: carCount,
        laps: targetLaps,
        track: selectedTrack?.name || 'Silverstone GP',
        seed: 42,
        sim_backend: simBackend
      },
      style: {
        trainingStyle,
        isDefaultStyle,
        smoothAggressive,
        oversteerUndersteer
      },
      physics: physicsToggles,
      car_setup: carSetupValues,
      target_lap_time: {
        source: targetLapTimeMode,
        value_s: computedTargetLapTime
      },
      rewards: paramValues,
      values: paramValues,
      custom: customParams
    };

    setRunState('running');
    setIsLearnerLocked(true);
    setLapHistory([]);
    setCars([]);

    try {
      const res = await fetch('/api/run/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_config: runConfig, is_demo: isDemoMode })
      });
      const data = await res.json();
      if (data.hash) setLearnerHash(data.hash);
      setTerminalLogs(prev => [...prev, `[CORE] Run initiated (PID ${data.runTimestamp}) | Learner locked`]);
    } catch (e) {
      console.error('Failed to start run:', e);
      setRunState('idle');
      setIsLearnerLocked(false);
    }
  };

  const pauseTraining = async () => {
    setRunState('paused');
    await fetch('/api/run/pause', { method: 'POST' });
  };

  const resumeTraining = async () => {
    setRunState('running');
    await fetch('/api/run/resume', { method: 'POST' });
  };

  const stopTraining = async () => {
    setRunState('idle');
    setIsLearnerLocked(false);
    await fetch('/api/run/stop', { method: 'POST' });
  };

  const triggerManualCheckpoint = async () => {
    await fetch('/api/run/checkpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag: `manual_${Date.now()}` })
    });
  };

  const resumeLastRun = async () => {
    try {
      const res = await fetch('/api/autosave/resume', { method: 'POST' });
      const data = await res.json();
      if (data.data) {
        setUncleanShutdown(false);
        if (data.data.state?.lap) {
          setLastAutosave(prev => ({
            ...prev,
            lap: data.data.lap || 0,
            time: data.data.timestamp || Date.now()
          }));
        }
        setTerminalLogs(prev => [...prev, `[CORE] Resumed run from rolling autosave slot (${data.data.reason})`]);
      }
    } catch (e) {
      console.error('Error resuming:', e);
    }
  };

  const dismissUncleanNotice = () => {
    setUncleanShutdown(false);
  };

  // Parameter manipulations
  const setParamValue = (key: string, value: any) => {
    setParamValues(prev => ({ ...prev, [key]: value }));
    setModifiedKeys(prev => new Set(prev).add(key));
  };

  const resetParamToDefault = (key: string) => {
    if (defaultParamValues[key] !== undefined) {
      setParamValues(prev => ({ ...prev, [key]: defaultParamValues[key] }));
      setModifiedKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const resetAllParams = () => {
    setParamValues({ ...defaultParamValues });
    setModifiedKeys(new Set());
  };

  const applyHotParam = (key: string) => {
    setAppliedHotKeys(prev => new Set(prev).add(key));
    if (wsRef.current && wsConnected) {
      wsRef.current.send(JSON.stringify({
        type: 'config_update',
        path: key,
        value: paramValues[key]
      }));
    }
  };

  const addCustomParam = (param: CustomParam) => {
    setCustomParams(prev => [...prev, param]);
  };

  const removeCustomParam = (key: string) => {
    setCustomParams(prev => prev.filter(p => p.key !== key));
  };

  // Car Setup manipulations
  const setCarSetupValue = (tab: string, param: string, val: number) => {
    const fullKey = `${tab}.${param}`;
    setCarSetupValues(prev => ({ ...prev, [fullKey]: val }));
  };

  const resetCarSetupTab = (tab: string) => {
    // defaults
    const defaults: Record<string, number> = {
      'suspension.front_springs': 8,
      'suspension.rear_springs': 6,
      'suspension.front_bump': 5,
      'suspension.rear_bump': 4,
      'tyres.front_pressure_psi': 23.5,
      'tyres.rear_pressure_psi': 21.0,
      'arb.front_anti_roll_bar': 7,
      'arb.rear_anti_roll_bar': 5,
      'ride_height.front': 3,
      'ride_height.rear': 6,
      'wings.front_wing': 7,
      'wings.rear_wing': 8,
      'fuel.initial_load_kg': 12.5,
      'differential.on_throttle_pct': 70,
      'differential.off_throttle_pct': 55,
      'brake.brake_pressure_pct': 95,
      'brake.brake_bias_pct': 54,
      'toe_camber.front_camber_deg': -2.8,
      'toe_camber.rear_camber_deg': -1.4,
      'toe_camber.front_toe_deg': 0.08,
      'toe_camber.rear_toe_deg': 0.24,
    };
    setCarSetupValues(prev => {
      const next = { ...prev };
      for (const k of Object.keys(defaults)) {
        if (k.startsWith(tab)) {
          next[k] = defaults[k];
        }
      }
      return next;
    });
  };

  const setPhysicsToggle = (key: string, val: boolean) => {
    setPhysicsToggles(prev => ({ ...prev, [key]: val }));
  };

  const toggleTestModelId = (id: string) => {
    setTestModelIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(m => m !== id);
      }
      if (prev.length >= 5) return prev; // max 5
      return [...prev, id];
    });
  };

  // Validation Warnings
  const validationWarnings = React.useMemo(() => {
    return validateParams(paramValues);
  }, [paramValues]);

  // Next autosave indicator estimate
  const nextAutosaveEstimate = React.useMemo(() => {
    const everyPct = Number(paramValues['autosave.every_pct'] ?? 5.0);
    const everyMin = Number(paramValues['autosave.every_min'] ?? 5.0);
    const currentLap = latestLap?.lap || 0;
    const lapsSince = currentLap - lastAutosave.lap;
    const thresholdLaps = (everyPct / 100.0) * targetLaps;
    const pctProgress = Math.min(100, (lapsSince / Math.max(1, thresholdLaps)) * 100);

    const elapsedSeconds = (Date.now() - lastAutosave.time) / 1000;
    const remainingSeconds = Math.max(0, (everyMin * 60) - elapsedSeconds);
    const m = Math.floor(remainingSeconds / 60);
    const s = Math.floor(remainingSeconds % 60);
    const mmss = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

    return {
      pct: Math.round(pctProgress),
      mmss
    };
  }, [paramValues, latestLap, lastAutosave, targetLaps]);

  return (
    <SimContext.Provider
      value={{
        activeScreen,
        previousScreen,
        navigateTo,
        runState,
        speedMode,
        setSpeedMode,
        lapDurationSeconds,
        setLapDurationSeconds,
        isDemoMode,
        setIsDemoMode,
        startTraining,
        pauseTraining,
        resumeTraining,
        stopTraining,
        triggerManualCheckpoint,
        isLearnerLocked,
        learnerHash,
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
        refreshTracks,
        deleteTrack,
        paramsSchema,
        paramValues,
        customParams,
        modifiedKeys,
        setParamValue,
        resetParamToDefault,
        resetAllParams,
        applyHotParam,
        addCustomParam,
        removeCustomParam,
        validationWarnings,
        carSetupValues,
        setCarSetupValue,
        resetCarSetupTab,
        uncleanShutdown,
        resumeLastRun,
        dismissUncleanNotice,
        terminalLogs,
        highModeStatusLine,
        emittedChecklist,
        wsConnected
      }}
    >
      {children}
    </SimContext.Provider>
  );
};

export const useSim = () => {
  const context = useContext(SimContext);
  if (!context) throw new Error('useSim must be used within SimProvider');
  return context;
};
