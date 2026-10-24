import React, { useState, useMemo } from 'react';
import { useSim } from '../../context/SimContext.tsx';
import { computeRiskBreakEven } from '../../utils/engineUtils.ts';
import {
  Trophy,
  AlertTriangle,
  RotateCcw,
  Zap,
  Sliders,
  HelpCircle,
  TrendingUp,
  ShieldAlert,
  Percent,
  Download,
  Upload,
  Bookmark
} from 'lucide-react';

export const RewardsScreen: React.FC = () => {
  const {
    paramsSchema,
    paramValues,
    setParamValue,
    resetParamToDefault,
    resetAllParams,
    applyHotParam,
    modifiedKeys,
    validationWarnings,
    runState,
    latestLap
  } = useSim();

  // Filter rewards groups
  const rewardGroups = ['Reference', 'Track Training', 'Quali Push Laps', 'In/Out Laps', 'Crashes', 'Segment Rules'];

  const rewardParams = useMemo(() => {
    return paramsSchema.filter((p) => rewardGroups.includes(p.group));
  }, [paramsSchema]);

  // Risk Calculator State
  const [calcPhase, setCalcPhase] = useState<'track_training' | 'quali_training'>('quali_training');
  const [calcDelta, setCalcDelta] = useState<number>(0.3);
  const [calcCrashType, setCalcCrashType] = useState<string>('crash.push_corner');

  const crashPenaltyVal = Number(paramValues[calcCrashType] ?? 1000000);
  const riskResult = useMemo(() => {
    return computeRiskBreakEven(calcPhase, calcDelta, crashPenaltyVal, {
      quali_c: Number(paramValues['quali.upside_c'] ?? 20000),
      quali_d: Number(paramValues['quali.upside_d'] ?? 5),
      quali_clamp: Number(paramValues['quali.upside_delta_clamp_s'] ?? 2.0),
      track_mult: Number(paramValues['track.improve_mult'] ?? 4.0)
    });
  }, [calcPhase, calcDelta, crashPenaltyVal, paramValues]);

  // Table at deltas = 0.05, 0.1, 0.3, 0.5, 1, 2
  const standardDeltas = [0.05, 0.1, 0.3, 0.5, 1.0, 2.0];
  const deltaTableData = useMemo(() => {
    return standardDeltas.map((d) => {
      return computeRiskBreakEven(calcPhase, d, crashPenaltyVal, {
        quali_c: Number(paramValues['quali.upside_c'] ?? 20000),
        quali_d: Number(paramValues['quali.upside_d'] ?? 5),
        quali_clamp: Number(paramValues['quali.upside_delta_clamp_s'] ?? 2.0),
        track_mult: Number(paramValues['track.improve_mult'] ?? 4.0)
      });
    });
  }, [calcPhase, crashPenaltyVal, paramValues]);

  // Curve previews computation: Upside reward vs seconds faster
  const upsideCurvePoints = useMemo(() => {
    const pts = [];
    const c = Number(paramValues['quali.upside_c'] ?? 20000);
    const d = Number(paramValues['quali.upside_d'] ?? 5);
    const clamp = Number(paramValues['quali.upside_delta_clamp_s'] ?? 2.0);

    for (let delta = 0; delta <= clamp; delta += clamp / 20) {
      const reward = c * (Math.exp(d * delta) - 1);
      pts.push({ delta: Number(delta.toFixed(2)), reward });
    }
    return pts;
  }, [paramValues]);

  // Over-limit penalty vs seconds over
  const overLimitPoints = useMemo(() => {
    const pts = [];
    const a = Number(paramValues['inout.over_a'] ?? 2.0);
    const mode = paramValues['inout.over_b_mode'] || 'derived';
    const b = mode === 'derived' ? (1 + 1 / Math.max(0.1, a)) : Number(paramValues['inout.over_b_manual'] ?? 1.5);
    const cap = Number(paramValues['inout.over_cap'] ?? 500000);

    for (let excess = 0; excess <= 10; excess += 0.5) {
      const pen = Math.min(cap, a * (Math.exp(b * excess) - 1));
      pts.push({ excess, penalty: pen });
    }
    return pts;
  }, [paramValues]);

  // Presets handling
  const [presetName, setPresetName] = useState<string>('Standard Formula 1');
  const [showDiffModal, setShowDiffModal] = useState<boolean>(false);

  return (
    <div className="flex-1 h-screen overflow-y-auto overflow-x-hidden flex p-4 bg-[#07090F] gap-4 select-none font-mono">
      {/* Left Column: Grouped Parameter Cards */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto pr-1">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#1E2740]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#121826] border border-[#1E2740] text-[#FFC247]">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold uppercase tracking-wider text-[#D7DEEC]">
                  REWARDS & OBJECTIVE FUNCTION SPECIFICATION
                </h1>
                <p className="text-[11px] text-[#7C88A6]">
                  Exponential upside curves, in/out limits, segment wipes, and risk penalties
                </p>
              </div>
            </div>

            {/* Presets and Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDiffModal(true)}
                className="px-3 py-1.5 rounded-xl bg-[#121826] border border-[#1E2740] text-xs text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer"
              >
                Diff vs Defaults
              </button>
              <button
                onClick={resetAllParams}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121826] border border-[#1E2740] text-xs text-[#7C88A6] hover:text-[#FF4458] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset All</span>
              </button>
            </div>
          </div>

          {/* Validation Warnings (Non-blocking) */}
          {validationWarnings.length > 0 && (
            <div className="my-3 p-3 rounded-xl bg-[#FFC247]/10 border border-[#FFC247]/40 text-xs text-[#FFC247] space-y-1">
              <div className="flex items-center gap-1.5 font-bold uppercase text-[11px]">
                <AlertTriangle className="w-4 h-4" />
                <span>Validation Advisory Warnings ({validationWarnings.length}):</span>
              </div>
              {validationWarnings.map((w, i) => (
                <div key={i} className="pl-5 text-[10px] text-[#D7DEEC]">
                  • <strong className="text-[#FFC247]">{w.field}:</strong> {w.message}
                </div>
              ))}
            </div>
          )}

          {/* Parameter Cards Grouped */}
          <div className="space-y-4 my-3">
            {rewardGroups.map((groupName) => {
              const groupParams = rewardParams.filter((p) => p.group === groupName);
              if (groupParams.length === 0) return null;

              return (
                <div key={groupName} className="p-3.5 rounded-[14px] bg-[#0D111A] border-2 border-[#1E2740] space-y-2.5">
                  <div className="text-xs font-bold text-[#19B8C9] uppercase tracking-wider pb-1 border-b border-[#1E2740]">
                    {groupName}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {groupParams.map((param) => {
                      const val = paramValues[param.key] !== undefined ? paramValues[param.key] : param.default;
                      const isModified = modifiedKeys.has(param.key);
                      const isPlaceholder = param.placeholder && !isModified;

                      return (
                        <div
                          key={param.key}
                          className="p-2.5 rounded-xl bg-[#121826] border border-[#1E2740] flex flex-col justify-between relative group"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#D7DEEC]">{param.label}</span>
                              {isModified && (
                                <span className="w-2 h-2 rounded-full bg-[#3DFF8F]" title="Modified from schema default" />
                              )}
                              {isPlaceholder && (
                                <span className="px-1.5 py-0.2 rounded bg-[#FFC247]/20 border border-[#FFC247]/50 text-[#FFC247] text-[8px] font-bold uppercase tracking-wider">
                                  PLACEHOLDER
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => resetParamToDefault(param.key)}
                              className="text-[#7C88A6] hover:text-[#D7DEEC] p-0.5 cursor-pointer"
                              title="Reset to default"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-[10px] text-[#7C88A6] line-clamp-2 my-1">
                            {param.description}
                          </div>

                          {/* Control Input & Hot Apply */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#1E2740]/60">
                            {param.type === 'boolean' ? (
                              <button
                                onClick={() => setParamValue(param.key, !val)}
                                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase cursor-pointer ${
                                  val ? 'bg-[#19B8C9] text-black' : 'bg-[#07090F] text-[#7C88A6]'
                                }`}
                              >
                                {val ? 'TRUE' : 'FALSE'}
                              </button>
                            ) : param.type === 'array_string' ? (
                              <span className="text-[10px] text-[#FFC247] font-mono">
                                [{Array.isArray(val) ? val.join(', ') : val}]
                              </span>
                            ) : (
                              <div className="flex items-center gap-1 flex-1">
                                <input
                                  type={param.type === 'integer' || param.type === 'number' ? 'number' : 'text'}
                                  step={param.type === 'number' ? '0.1' : '1'}
                                  min={param.min}
                                  max={param.max}
                                  value={val}
                                  onChange={(e) => {
                                    const next = param.type === 'integer'
                                      ? parseInt(e.target.value) || 0
                                      : param.type === 'number'
                                      ? parseFloat(e.target.value) || 0
                                      : e.target.value;
                                    setParamValue(param.key, next);
                                  }}
                                  className="w-24 bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded px-2 py-0.5 text-xs text-right outline-none focus:border-[#19B8C9]"
                                />
                                <span className="text-[10px] text-[#7C88A6]">{param.unit}</span>
                              </div>
                            )}

                            {param.hot && runState === 'running' && (
                              <button
                                onClick={() => applyHotParam(param.key)}
                                className="px-2 py-0.5 rounded bg-[#3DFF8F]/20 border border-[#3DFF8F]/50 text-[#3DFF8F] text-[9px] font-bold hover:bg-[#3DFF8F]/30 transition-all cursor-pointer"
                              >
                                Apply Now
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: Curve Previews, Risk Calculator, and Last Lap Breakdown */}
      <div className="w-96 shrink-0 flex flex-col justify-between p-3.5 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] overflow-y-auto space-y-4">
        {/* Section 1: Risk Calculator */}
        <div className="space-y-2 pb-3 border-b border-[#1E2740]">
          <div className="flex items-center justify-between text-xs font-bold text-[#D7DEEC] uppercase">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-[#FF4458]" />
              <span>Risk & Break-Even Calculator</span>
            </span>
            <span className="text-[10px] text-[#FFC247]">p = G / (G + F)</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-[9px] text-[#7C88A6] uppercase">Phase:</label>
              <select
                value={calcPhase}
                onChange={(e) => setCalcPhase(e.target.value as any)}
                className="w-full bg-[#07090F] border border-[#1E2740] text-[#19B8C9] rounded px-1.5 py-1 text-[10px]"
              >
                <option value="quali_training">Quali</option>
                <option value="track_training">Track</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] text-[#7C88A6] uppercase">Delta Faster:</label>
              <input
                type="number"
                step="0.05"
                min="0.01"
                max="5.0"
                value={calcDelta}
                onChange={(e) => setCalcDelta(parseFloat(e.target.value) || 0.1)}
                className="w-full bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded px-1.5 py-1 text-[10px] text-right"
              />
            </div>
            <div>
              <label className="text-[9px] text-[#7C88A6] uppercase">Crash Type:</label>
              <select
                value={calcCrashType}
                onChange={(e) => setCalcCrashType(e.target.value)}
                className="w-full bg-[#07090F] border border-[#1E2740] text-[#FF4458] rounded px-1 py-1 text-[10px]"
              >
                <option value="crash.push_corner">Corner</option>
                <option value="crash.push_intermediate">Inter</option>
                <option value="crash.push_straight">Straight</option>
                <option value="crash.inout">In/Out</option>
              </select>
            </div>
          </div>

          {/* Result Cards */}
          <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#07090F] p-2.5 rounded-xl border border-[#1E2740]">
            <div>
              <span className="text-[#7C88A6]">Gain G (Reward):</span>
              <div className="text-xs font-bold text-[#3DFF8F]">{riskResult.gain.toFixed(0)} pts</div>
            </div>
            <div>
              <span className="text-[#7C88A6]">Penalty F (Crash):</span>
              <div className="text-xs font-bold text-[#FF4458]">{riskResult.penalty.toFixed(0)} pts</div>
            </div>
            <div className="pt-1 border-t border-[#1E2740]">
              <span className="text-[#7C88A6]">G / F Ratio:</span>
              <div className="text-xs font-bold text-[#19B8C9]">{riskResult.ratioGF.toFixed(4)}</div>
            </div>
            <div className="pt-1 border-t border-[#1E2740]">
              <span className="text-[#7C88A6]">Break-even Crash Prob:</span>
              <div className="text-xs font-bold text-[#FFC247]">
                {(riskResult.breakevenProb * 100).toFixed(4)}%
              </div>
            </div>
          </div>

          {/* Standard Deltas Table */}
          <div className="space-y-1">
            <div className="text-[9px] text-[#7C88A6] uppercase font-bold">Break-Even Matrix:</div>
            <div className="grid grid-cols-4 gap-1 text-[9px] text-center">
              {deltaTableData.map((row) => (
                <div key={row.delta} className="p-1 rounded bg-[#121826] border border-[#1E2740]">
                  <div className="text-[#19B8C9] font-bold">-{row.delta}s</div>
                  <div className="text-[#FFC247]">{(row.breakevenProb * 100).toFixed(2)}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Curve Previews (Upside vs Delta & Over-limit vs excess) */}
        <div className="space-y-2 pb-3 border-b border-[#1E2740]">
          <div className="text-xs font-bold text-[#D7DEEC] uppercase">Reward Curve Geometry</div>

          {/* SVG Preview of Upside Reward Curve */}
          <div className="p-2.5 rounded-xl bg-[#07090F] border border-[#1E2740]">
            <div className="flex items-center justify-between text-[10px] text-[#7C88A6] mb-1">
              <span>Upside Reward: c·(e^(d·Δ) - 1)</span>
              <span className="text-[#3DFF8F]">Clamp: {paramValues['quali.upside_delta_clamp_s'] || 2.0}s</span>
            </div>
            <svg viewBox="0 0 200 60" className="w-full h-14">
              <path
                d="M 10 50 Q 80 48, 140 25 T 190 5"
                fill="none"
                stroke="#3DFF8F"
                strokeWidth="2.5"
              />
              <line x1="10" y1="50" x2="190" y2="50" stroke="#1E2740" strokeWidth="1" />
              <text x="10" y="58" fill="#7C88A6" fontSize="7">0s</text>
              <text x="180" y="58" fill="#7C88A6" fontSize="7">+{paramValues['quali.upside_delta_clamp_s'] || 2.0}s</text>
            </svg>
          </div>
        </div>

        {/* Section 3: Last Lap Reward Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#D7DEEC] uppercase">
            <span>Last Lap Reward Breakdown</span>
            <span className="text-[10px] text-[#7C88A6]">Lap {latestLap?.lap || 0}</span>
          </div>

          {latestLap?.reward_breakdown && Object.keys(latestLap.reward_breakdown).length > 0 ? (
            <div className="space-y-1.5 text-[10px] bg-[#07090F] p-2.5 rounded-xl border border-[#1E2740]">
              {Object.entries(latestLap.reward_breakdown).map(([term, val]) => (
                <div key={term} className="flex items-center justify-between">
                  <span className="text-[#7C88A6] capitalize">{term.replace('_', ' ')}:</span>
                  <span className={`font-bold ${val >= 0 ? 'text-[#3DFF8F]' : 'text-[#FF4458]'}`}>
                    {val > 0 ? `+${val}` : val}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#07090F] border border-[#1E2740] text-center text-[10px] text-[#7C88A6]">
              Awaiting lap completion telemetry...
            </div>
          )}
        </div>
      </div>

      {/* Diff vs Defaults Modal */}
      {showDiffModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-[500px] bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E2740] pb-2">
              <span className="font-bold text-sm text-[#D7DEEC] uppercase">Parameters Diff vs Defaults</span>
              <button onClick={() => setShowDiffModal(false)} className="text-[#7C88A6] hover:text-white cursor-pointer">✕</button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1 text-xs">
              {Array.from(modifiedKeys).length === 0 ? (
                <div className="text-[#7C88A6] italic py-4 text-center">All parameters match defaults perfectly.</div>
              ) : (
                Array.from(modifiedKeys).map((k) => (
                  <div key={k} className="p-2 rounded bg-[#07090F] border border-[#1E2740] flex items-center justify-between">
                    <span className="text-[#19B8C9]">{k}</span>
                    <span className="font-bold text-[#FFC247]">{JSON.stringify(paramValues[k])}</span>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setShowDiffModal(false)}
              className="w-full py-2 bg-[#19B8C9] text-black font-bold text-xs rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
