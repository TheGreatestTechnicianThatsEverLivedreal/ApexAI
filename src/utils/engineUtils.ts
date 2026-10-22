/**
 * Core mathematical models, validators, expression evaluators,
 * and autosave logic for ApexAI F1 Sim.
 */

// 1. SAFE EXPRESSION EVALUATOR (No eval)
export interface ExpressionScope {
  last_target: number;
  last_best_avg: number;
  last_best_lap: number;
}

export function evaluateSafeExpression(expr: string, scope: ExpressionScope): number {
  if (!expr || typeof expr !== 'string') return scope.last_best_avg;
  const clean = expr.trim().toLowerCase();

  // Direct identifiers
  if (clean === 'last_best_avg') return scope.last_best_avg;
  if (clean === 'last_target') return scope.last_target;
  if (clean === 'last_best_lap') return scope.last_best_lap;

  // Simple tokenizer
  const tokensMatch = clean.match(/([a-z_][a-z0-9_]*|\d+\.?\d*|\+|\-|\*|\/|\(|\)|,)/g);
  if (!tokensMatch) return scope.last_best_avg;
  const tokens: string[] = tokensMatch;

  let pos = 0;

  function peek(): string | null {
    return pos < tokens.length ? tokens[pos] : null;
  }

  function consume(expected?: string): string {
    const t = tokens[pos++];
    if (expected && t !== expected) {
      throw new Error(`Expected '${expected}' but got '${t}'`);
    }
    return t;
  }

  function parsePrimary(): number {
    const t = peek();
    if (!t) throw new Error('Unexpected end of expression');

    if (t === '(') {
      consume('(');
      const val = parseExpr();
      consume(')');
      return val;
    }

    if (t === 'min' || t === 'max') {
      const fn = consume();
      consume('(');
      const a = parseExpr();
      consume(',');
      const b = parseExpr();
      consume(')');
      return fn === 'min' ? Math.min(a, b) : Math.max(a, b);
    }

    if (t === '-') {
      consume('-');
      return -parsePrimary();
    }

    if (t === 'last_target') {
      consume();
      return scope.last_target;
    }
    if (t === 'last_best_avg') {
      consume();
      return scope.last_best_avg;
    }
    if (t === 'last_best_lap') {
      consume();
      return scope.last_best_lap;
    }

    const num = parseFloat(t);
    if (!isNaN(num)) {
      consume();
      return num;
    }

    throw new Error(`Unknown token: ${t}`);
  }

  function parseFactor(): number {
    let val = parsePrimary();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const rhs = parsePrimary();
      if (op === '*') val *= rhs;
      else if (op === '/') val = rhs !== 0 ? val / rhs : val;
    }
    return val;
  }

  function parseExpr(): number {
    let val = parseFactor();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const rhs = parseFactor();
      if (op === '+') val += rhs;
      else if (op === '-') val -= rhs;
    }
    return val;
  }

  try {
    const res = parseExpr();
    return isFinite(res) ? res : scope.last_best_avg;
  } catch (e) {
    return scope.last_best_avg;
  }
}

// 2. BREAK-EVEN RISK CALCULATOR
export interface RiskResult {
  delta: number;
  gain: number;
  penalty: number;
  ratioGF: number;
  breakevenProb: number; // p = G / (G + F)
  overflowWarning: boolean;
}

export function computeRiskBreakEven(
  phase: 'track_training' | 'quali_training',
  delta: number, // positive seconds faster
  crashPenalty: number,
  params: {
    quali_c?: number;
    quali_d?: number;
    quali_clamp?: number;
    track_mult?: number;
  }
): RiskResult {
  const c = params.quali_c ?? 20000.0;
  const d = params.quali_d ?? 5.0;
  const clamp = params.quali_clamp ?? 2.0;
  const trackMult = params.track_mult ?? 4.0;

  let gain = 0;
  let overflowWarning = false;

  if (phase === 'quali_training') {
    const effectiveDelta = Math.min(delta, clamp);
    const exponent = d * effectiveDelta;
    if (exponent > 88.0) {
      // Near float32 limit e^88 ~ 1.6e38
      overflowWarning = true;
      gain = 3.4e38;
    } else {
      gain = c * (Math.exp(exponent) - 1);
    }
  } else {
    // Track training is linear
    gain = trackMult * delta;
  }

  if (gain > 3.4e38) {
    overflowWarning = true;
  }

  const penalty = Math.max(1.0, crashPenalty);
  const ratioGF = gain / penalty;
  const breakevenProb = gain / (gain + penalty);

  return {
    delta,
    gain,
    penalty,
    ratioGF,
    breakevenProb,
    overflowWarning,
  };
}

// 3. PARAMETERS VALIDATORS
export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning' | 'error';
}

export function validateParams(values: Record<string, any>): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Crash hierarchy: crash.inout >= crash.push_straight >= crash.push_intermediate >= crash.push_corner > inout.over_cap
  const inoutCrash = Number(values['crash.inout'] ?? 100000000);
  const pushStraight = Number(values['crash.push_straight'] ?? 10000000);
  const pushInter = Number(values['crash.push_intermediate'] ?? 3000000);
  const pushCorner = Number(values['crash.push_corner'] ?? 1000000);
  const overCap = Number(values['inout.over_cap'] ?? 500000);

  if (inoutCrash < pushStraight) {
    warnings.push({
      field: 'crash.inout',
      message: 'crash.inout should be >= crash.push_straight according to safety hierarchy',
      severity: 'warning',
    });
  }
  if (pushStraight < pushInter) {
    warnings.push({
      field: 'crash.push_straight',
      message: 'crash.push_straight should be >= crash.push_intermediate',
      severity: 'warning',
    });
  }
  if (pushInter < pushCorner) {
    warnings.push({
      field: 'crash.push_intermediate',
      message: 'crash.push_intermediate should be >= crash.push_corner',
      severity: 'warning',
    });
  }
  if (pushCorner <= overCap) {
    warnings.push({
      field: 'crash.push_corner',
      message: 'crash.push_corner must be strictly greater than inout.over_cap',
      severity: 'warning',
    });
  }

  // Quali clamp validation
  const clamp = values['quali.upside_delta_clamp_s'];
  if (clamp === undefined || clamp === null || clamp === '' || Number(clamp) <= 0) {
    warnings.push({
      field: 'quali.upside_delta_clamp_s',
      message: 'quali.upside_delta_clamp_s is zero or empty. High delta improvements may trigger float32 overflow.',
      severity: 'warning',
    });
  }

  // Float32 overflow test on previewed upside reward
  const c = Number(values['quali.upside_c'] ?? 20000);
  const d = Number(values['quali.upside_d'] ?? 5);
  const clampVal = Number(clamp ?? 2.0);
  if (d * clampVal > 88.0 || c * (Math.exp(Math.min(d * clampVal, 90)) - 1) > 3.4e38) {
    warnings.push({
      field: 'quali.upside_c',
      message: 'Upside reward curve exceeds 3.4e38 (float32 overflow limit) at maximum clamp.',
      severity: 'warning',
    });
  }

  return warnings;
}

// 4. AUTOSAVE TRIGGER EVALUATOR
export interface AutosaveState {
  lastAutosaveTime: number; // Unix timestamp in seconds
  lastAutosaveLap: number;
}

export function shouldAutosave(
  currentState: {
    now: number; // seconds
    currentLap: number;
    targetLaps: number; // e.g. 1000
    phase: string;
    hasPausedOrStopped?: boolean;
    handoffTriggered?: boolean;
  },
  lastState: AutosaveState,
  config: {
    every_pct: number; // e.g. 5.0 %
    every_min: number; // e.g. 5.0 minutes
    min_interval_s: number; // e.g. 30.0 seconds
  }
): { trigger: boolean; reason: string } {
  const elapsedSeconds = currentState.now - lastState.lastAutosaveTime;

  // Immediate triggers
  if (currentState.hasPausedOrStopped) {
    return { trigger: true, reason: 'pause_or_stop' };
  }
  if (currentState.handoffTriggered) {
    return { trigger: true, reason: 'handoff_to_quali' };
  }

  // Throttling window check
  if (elapsedSeconds < config.min_interval_s) {
    return { trigger: false, reason: 'throttled' };
  }

  // Time-based trigger
  if (elapsedSeconds >= config.every_min * 60) {
    return { trigger: true, reason: `time_interval_${config.every_min}m` };
  }

  // Percentage of target laps trigger
  if (currentState.targetLaps > 0) {
    const lapsSince = currentState.currentLap - lastState.lastAutosaveLap;
    const lapsThreshold = (config.every_pct / 100.0) * currentState.targetLaps;
    if (lapsSince >= lapsThreshold) {
      return { trigger: true, reason: `lap_target_${config.every_pct}%` };
    }
  }

  return { trigger: false, reason: 'none' };
}

// 5. FINITE WEIGHTS VALIDATOR
export function validateFiniteWeights(tensors: any): boolean {
  if (tensors === null || tensors === undefined) return false;
  if (typeof tensors === 'number') {
    return Number.isFinite(tensors) && !isNaN(tensors);
  }
  if (Array.isArray(tensors)) {
    for (let i = 0; i < tensors.length; i++) {
      if (!validateFiniteWeights(tensors[i])) return false;
    }
    return true;
  }
  if (typeof tensors === 'object') {
    for (const key of Object.keys(tensors)) {
      if (!validateFiniteWeights(tensors[key])) return false;
    }
    return true;
  }
  return true;
}

// 6. BUILD EQUIVALENCE CHECKER
export interface BenchmarkVariantResult {
  name: string;
  speedup: number;
  maxDiff: number;
  equivalent: boolean;
  status: 'valid' | 'fallback' | 'error';
}

export function evaluateBuildEquivalence(
  plainOutputs: number[],
  variantOutputs: number[],
  tolerance = 1e-6
): { maxDiff: number; isEquivalent: boolean } {
  if (plainOutputs.length !== variantOutputs.length) {
    return { maxDiff: Infinity, isEquivalent: false };
  }
  let maxDiff = 0;
  for (let i = 0; i < plainOutputs.length; i++) {
    const diff = Math.abs(plainOutputs[i] - variantOutputs[i]);
    if (diff > maxDiff) maxDiff = diff;
    if (diff > tolerance || !Number.isFinite(diff)) {
      return { maxDiff, isEquivalent: false };
    }
  }
  return { maxDiff, isEquivalent: true };
}
