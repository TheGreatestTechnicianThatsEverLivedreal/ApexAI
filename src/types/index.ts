/**
 * ApexAI F1 Sim TypeScript Interface Definitions
 */

export type ScreenId = 'train' | 'setup' | 'builder' | 'car_setup' | 'learner' | 'rewards' | 'values' | 'tracks';

export type SpeedMode = 'no' | 'low' | 'high';
export type RunState = 'idle' | 'running' | 'paused' | 'saving';
export type TrainingPhase = 'track_training' | 'quali_training';
export type LapType = 'out' | 'push' | 'in';

export interface ParamDefinition {
  key: string;
  label: string;
  type: 'integer' | 'number' | 'boolean' | 'string' | 'array_string';
  default: any;
  unit: string;
  min?: number;
  max?: number;
  group: string;
  description: string;
  hot: boolean;
  placeholder: boolean;
  options?: string[];
}

export interface CustomParam {
  key: string;
  type: 'int' | 'float' | 'bool' | 'string';
  value: any;
  min?: number;
  max?: number;
  description: string;
  group: string;
  hot: boolean;
}

export interface CarTelemetry {
  id: string;
  name: string;
  x: number;
  y: number;
  heading: number;
  segment: number;
  progress: number;
  speed_kmh: number;
}

export interface LapCompleteEvent {
  car: string;
  lap: number;
  lap_type: LapType;
  cycle_pos: number;
  time: number;
  sectors: number[];
  segments: {
    id: number;
    type: 'straight' | 'intermediate' | 'corner';
    colour: 'purple' | 'green' | 'yellow' | 'red';
    time: number;
  }[];
  delta: number;
  tyre_health: number;
  battery_s3: number;
  crash?: {
    type: string;
    location_type: string;
    segment: number;
  };
  fail_reason?: string;
  reward_breakdown: Record<string, number>;
}

export interface PushStats {
  best: number;
  avg: number;
  fail_rate: number;
  fail_top3: string[];
  avg_delta: number;
  consistency: number;
  success: number;
}

export interface GovernorState {
  workers: number;
  cpu_pct: number;
  temp_c: number;
  ram_pct: number;
  throttling: boolean;
  on_battery: boolean;
}

export interface PastModel {
  id: string;
  name: string;
  arch: {
    layers: number[];
    input_toggles: Record<string, boolean>;
    output_toggles: Record<string, boolean>;
  } | null;
  meta: {
    trained_laps: number;
    description?: string;
    per_track: Record<string, {
      best_window_avg_s: number;
      avg_lap_s: number;
      track_training_done: boolean;
      last_target_s: number;
      last_best_s: number;
    }>;
  } | null;
}

export interface TrackData {
  id: string;
  name: string;
  length_m: number;
  cell_size_m: number;
  sectors: { index: number; name: string; distance_m: number; colour: string }[];
  drs_zones: { index: number; detection_m: number; activation_m: number; end_m: number; colour: string }[];
  speed_trap: { distance_m: number; x: number; y: number; colour: string };
  surface_legend: {
    id: number;
    name: string;
    colour: string;
    grip_mu: number;
    solid: boolean;
  }[];
}
