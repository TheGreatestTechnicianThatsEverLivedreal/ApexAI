/**
 * Comprehensive Unit Test Suite for ApexAI F1 Sim Core
 * Tests:
 * 1. Parameters Validators (Crash hierarchy, Float32 overflow, Clamp validation)
 * 2. Safe Expression Evaluator (no eval, scope handling, operators)
 * 3. Risk Break-Even Mathematics (G, F, G/F, p = G/(G+F))
 * 4. Autosave Triggers & NaN Weight Rejection
 * 5. Build Equivalence & Variant Fallback
 */

import {
  evaluateSafeExpression,
  computeRiskBreakEven,
  validateParams,
  shouldAutosave,
  validateFiniteWeights,
  evaluateBuildEquivalence
} from '../src/utils/engineUtils.ts';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (!condition) {
    console.error(`  FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  } else {
    passedTests++;
    console.log(`  PASS: ${msg}`);
  }
}

console.log('=== RUNNING APEXAI CORE UNIT TESTS ===\n');

// 1. EXPRESSION EVALUATOR TESTS
console.log('--- Suite 1: Safe Expression Evaluator ---');
const scope = {
  last_target: 84.50,
  last_best_avg: 83.20,
  last_best_lap: 82.80,
};

assert(
  Math.abs(evaluateSafeExpression('last_best_avg', scope) - 83.20) < 1e-4,
  'Evaluates raw variable "last_best_avg"'
);
assert(
  Math.abs(evaluateSafeExpression('last_best_lap - 0.2', scope) - 82.60) < 1e-4,
  'Evaluates subtraction "last_best_lap - 0.2"'
);
assert(
  Math.abs(evaluateSafeExpression('0.5 * (last_target + last_best_avg)', scope) - 83.85) < 1e-4,
  'Evaluates arithmetic with parens "0.5 * (last_target + last_best_avg)"'
);
assert(
  Math.abs(evaluateSafeExpression('min(last_target, last_best_lap)', scope) - 82.80) < 1e-4,
  'Evaluates min() function'
);
assert(
  Math.abs(evaluateSafeExpression('max(last_target, last_best_lap)', scope) - 84.50) < 1e-4,
  'Evaluates max() function'
);
assert(
  evaluateSafeExpression('invalid_syntax_%%%', scope) === scope.last_best_avg,
  'Gracefully falls back to last_best_avg on syntax error'
);

// 2. BREAK-EVEN RISK CALCULATOR TESTS
console.log('\n--- Suite 2: Break-Even Risk Mathematics ---');
// G = c * (e^(d * delta) - 1), F = crash_penalty, p = G / (G + F)
const r1 = computeRiskBreakEven('quali_training', 0.1, 1000000, {
  quali_c: 20000,
  quali_d: 5.0,
  quali_clamp: 2.0
});
const expectedGain = 20000 * (Math.exp(5.0 * 0.1) - 1);
assert(Math.abs(r1.gain - expectedGain) < 1e-2, 'Calculates exponential gain for delta=0.1s');
assert(r1.penalty === 1000000, 'Calculates crash penalty');
assert(Math.abs(r1.breakevenProb - (r1.gain / (r1.gain + 1000000))) < 1e-6, 'Computes p = G/(G+F)');

// Check standard deltas table
const deltas = [0.05, 0.1, 0.3, 0.5, 1.0, 2.0];
for (const d of deltas) {
  const res = computeRiskBreakEven('quali_training', d, 1000000, { quali_c: 20000, quali_d: 5.0, quali_clamp: 2.0 });
  assert(res.breakevenProb > 0 && res.breakevenProb < 1.0, `Break-even probability valid for delta=${d}s (p=${(res.breakevenProb * 100).toFixed(4)}%)`);
}

// 3. PARAMETERS VALIDATORS TESTS
console.log('\n--- Suite 3: Parameter Safety & Hierarchy Validators ---');
const validConfig = {
  'crash.inout': 100000000,
  'crash.push_straight': 10000000,
  'crash.push_intermediate': 3000000,
  'crash.push_corner': 1000000,
  'inout.over_cap': 500000,
  'quali.upside_delta_clamp_s': 2.0,
  'quali.upside_c': 20000,
  'quali.upside_d': 5
};
assert(validateParams(validConfig).length === 0, 'Valid config generates 0 warnings');

// Hierarchy breach: crash.inout < crash.push_straight
const invertedHierarchy = { ...validConfig, 'crash.inout': 5000000 };
const invWarnings = validateParams(invertedHierarchy);
assert(invWarnings.some(w => w.field === 'crash.inout'), 'Warns when crash.inout < crash.push_straight');

// Over cap breach: crash.push_corner <= inout.over_cap
const overCapBreach = { ...validConfig, 'crash.push_corner': 400000, 'inout.over_cap': 500000 };
const capWarnings = validateParams(overCapBreach);
assert(capWarnings.some(w => w.field === 'crash.push_corner'), 'Warns when crash.push_corner <= inout.over_cap');

// Missing/zero clamp warning
const zeroClamp = { ...validConfig, 'quali.upside_delta_clamp_s': 0 };
const clampWarnings = validateParams(zeroClamp);
assert(clampWarnings.some(w => w.field === 'quali.upside_delta_clamp_s'), 'Warns when quali clamp is 0');

// Float32 overflow test: extreme exponent
const extremeExp = { ...validConfig, 'quali.upside_d': 50.0, 'quali.upside_delta_clamp_s': 10.0 };
const overflowWarnings = validateParams(extremeExp);
assert(overflowWarnings.some(w => w.message.includes('float32 overflow')), 'Warns on float32 overflow risk');

// 4. AUTOSAVE TRIGGERS & FINITE WEIGHTS
console.log('\n--- Suite 4: Autosave Triggers & Rolling Atomic Slot ---');
const autosaveConfig = {
  every_pct: 5.0,
  every_min: 5.0,
  min_interval_s: 30.0
};
const lastState = {
  lastAutosaveTime: 1000.0,
  lastAutosaveLap: 100
};

// Test throttling
const throttled = shouldAutosave(
  { now: 1010.0, currentLap: 160, targetLaps: 1000, phase: 'track_training' },
  lastState,
  autosaveConfig
);
assert(!throttled.trigger && throttled.reason === 'throttled', 'Throttles autosave if under 30s elapsed');

// Test lap target percentage trigger (5% of 1000 = 50 laps)
const lapTrigger = shouldAutosave(
  { now: 1040.0, currentLap: 155, targetLaps: 1000, phase: 'track_training' },
  lastState,
  autosaveConfig
);
assert(lapTrigger.trigger && lapTrigger.reason.includes('lap_target'), 'Fires autosave on lap target percentage trigger');

// Test wall clock time trigger (5 min = 300s)
const timeTrigger = shouldAutosave(
  { now: 1350.0, currentLap: 105, targetLaps: 1000, phase: 'track_training' },
  lastState,
  autosaveConfig
);
assert(timeTrigger.trigger && timeTrigger.reason.includes('time_interval'), 'Fires autosave on wall clock minutes trigger');

// Finite weights validation (No NaN or Inf)
const cleanTensors = {
  layer1: [0.12, -0.45, 0.98],
  layer2: [[0.01, -0.02], [0.33, 0.44]],
  bias: 0.05
};
assert(validateFiniteWeights(cleanTensors) === true, 'Accepts valid finite numerical weights');

const nanTensors = {
  layer1: [0.12, NaN, 0.98],
  layer2: [[0.01, -0.02]],
};
assert(validateFiniteWeights(nanTensors) === false, 'Rejects weights containing NaN');

const infTensors = {
  layer1: [0.12, Infinity, 0.98],
};
assert(validateFiniteWeights(infTensors) === false, 'Rejects weights containing Infinity');

// 5. BUILD EQUIVALENCE CHECK
console.log('\n--- Suite 5: Build Equivalence & Variant Verification ---');
const plainOut = [0.124560, -0.489120, 0.771234];
const fastEqual = [0.1245601, -0.4891202, 0.7712341];
const fastDivergent = [0.124560, -0.510000, 0.771234];

const eqResult = evaluateBuildEquivalence(plainOut, fastEqual, 1e-5);
assert(eqResult.isEquivalent === true, 'Passes when outputs match within 1e-5 tolerance');

const divResult = evaluateBuildEquivalence(plainOut, fastDivergent, 1e-5);
assert(divResult.isEquivalent === false, 'Fails and triggers fallback when tolerance is breached');

console.log(`\n========================================`);
console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests}`);
console.log(`========================================\n`);
