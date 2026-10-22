import React, { useState, useMemo } from 'react';
import { useSim } from '../../context/SimContext.tsx';
import { CustomParam } from '../../types/index.ts';
import {
  Activity,
  Plus,
  Trash2,
  RotateCcw,
  Sliders,
  Zap,
  HelpCircle,
  FileJson,
  Cpu,
  Clock,
  HardDrive,
  X,
  PlayCircle
} from 'lucide-react';

export const ValuesScreen: React.FC = () => {
  const {
    paramsSchema,
    paramValues,
    setParamValue,
    resetParamToDefault,
    resetAllParams,
    applyHotParam,
    modifiedKeys,
    customParams,
    addCustomParam,
    removeCustomParam,
    runState
  } = useSim();

  // Filter values groups (everything other than rewards)
  const rewardGroups = ['Reference', 'Track Training', 'Quali Push Laps', 'In/Out Laps', 'Crashes', 'Segment Rules'];
  const valueParams = useMemo(() => {
    return paramsSchema.filter((p) => !rewardGroups.includes(p.group));
  }, [paramsSchema]);

  // Unique groups
  const groups = useMemo(() => {
    return Array.from(new Set(valueParams.map((p) => p.group)));
  }, [valueParams]);

  // New Custom Parameter Form Modal State
  const [showAddCustomModal, setShowAddCustomModal] = useState<boolean>(false);
  const [newKey, setNewKey] = useState<string>('');
  const [newType, setNewType] = useState<'int' | 'float' | 'bool' | 'string'>('float');
  const [newVal, setNewVal] = useState<any>(1.0);
  const [newMin, setNewMin] = useState<number>(0);
  const [newMax, setNewMax] = useState<number>(10);
  const [newDesc, setNewDesc] = useState<string>('');
  const [newGroup, setNewGroup] = useState<string>('Custom Strategy');
  const [newHot, setNewHot] = useState<boolean>(true);

  const handleCreateCustom = () => {
    if (!newKey) return;
    const item: CustomParam = {
      key: newKey,
      type: newType,
      value: newVal,
      min: newMin,
      max: newMax,
      description: newDesc,
      group: newGroup,
      hot: newHot
    };
    addCustomParam(item);
    setShowAddCustomModal(false);
    setNewKey('');
    setNewDesc('');
  };

  // Helper for Cycle Sequence manipulation
  const cycleSequence: string[] = useMemo(() => {
    const raw = paramValues['cycle.sequence'];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return raw.split(',').map((s) => s.trim()).filter(Boolean);
      }
    }
    return ['out', 'push', 'in', 'out', 'push', 'in'];
  }, [paramValues]);

  const updateCycleSequence = (newSeq: string[]) => {
    setParamValue('cycle.sequence', newSeq);
  };

  const toggleCycleStepType = (index: number) => {
    const current = cycleSequence[index] || 'push';
    const nextType = current === 'out' ? 'push' : current === 'push' ? 'in' : 'out';
    const next = [...cycleSequence];
    next[index] = nextType;
    updateCycleSequence(next);
  };

  const removeCycleStep = (index: number) => {
    if (cycleSequence.length <= 1) return;
    const next = cycleSequence.filter((_, i) => i !== index);
    updateCycleSequence(next);
  };

  const addCycleStep = (type: 'out' | 'push' | 'in') => {
    updateCycleSequence([...cycleSequence, type]);
  };

  return (
    <div className="flex-1 h-screen flex p-4 bg-[#07090F] gap-4 overflow-hidden select-none font-mono">
      {/* Main Parameters Column */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto pr-1">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#1E2740]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#121826] border border-[#1E2740] text-[#19B8C9]">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold uppercase tracking-wider text-[#D7DEEC]">
                  SYSTEM HYPERPARAMETERS & ENGINE VALUES
                </h1>
                <p className="text-[11px] text-[#7C88A6]">
                  Cycle sequencing, resource governors, autosave timers, terminal logging, and custom variables
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddCustomModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#19B8C9]/20 border border-[#19B8C9]/50 text-xs text-[#19B8C9] font-bold hover:bg-[#19B8C9]/30 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Variable</span>
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

          {/* Grouped Value Cards */}
          <div className="space-y-4 my-3">
            {groups.map((groupName) => {
              const groupParams = valueParams.filter((p) => p.group === groupName);
              return (
                <div key={groupName} className="p-3.5 rounded-[14px] bg-[#0D111A] border-2 border-[#1E2740] space-y-2.5">
                  <div className="text-xs font-bold text-[#19B8C9] uppercase tracking-wider pb-1 border-b border-[#1E2740] flex items-center justify-between">
                    <span>{groupName}</span>
                    {groupName === 'Cycle' && (
                      <span className="text-[10px] text-[#FFC247]">Click badges to cycle (OUT &rarr; PUSH &rarr; IN)</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {groupParams.map((param) => {
                      const val = paramValues[param.key] !== undefined ? paramValues[param.key] : param.default;
                      const isModified = modifiedKeys.has(param.key);
                      const isPlaceholder = param.placeholder && !isModified;

                      // Full-width card for cycle.sequence so user can comfortably edit sequence steps
                      const isCycleSeq = param.key === 'cycle.sequence';

                      return (
                        <div
                          key={param.key}
                          className={`p-2.5 rounded-xl bg-[#121826] border border-[#1E2740] flex flex-col justify-between ${
                            isCycleSeq ? 'col-span-2' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#D7DEEC]">{param.label}</span>
                              {isModified && (
                                <span className="w-2 h-2 rounded-full bg-[#3DFF8F]" title="Modified" />
                              )}
                              {isPlaceholder && (
                                <span className="px-1.5 py-0.2 rounded bg-[#FFC247]/20 border border-[#FFC247]/50 text-[#FFC247] text-[8px] font-bold uppercase tracking-wider">
                                  PLACEHOLDER
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => resetParamToDefault(param.key)}
                              className="text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer"
                              title="Reset"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="text-[10px] text-[#7C88A6] my-1">
                            {param.description}
                          </div>

                          {/* Interactive Parameter Control */}
                          <div className="pt-1 border-t border-[#1E2740]/60">
                            {isCycleSeq ? (
                              <div className="space-y-2 pt-1">
                                {/* Interactive Sequence Badge Pills */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {cycleSequence.map((step, idx) => {
                                    const isPush = step === 'push';
                                    const isOut = step === 'out';
                                    return (
                                      <div
                                        key={idx}
                                        className={`flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg border text-xs font-bold uppercase select-none transition-all ${
                                          isPush
                                            ? 'bg-[#3DFF8F]/20 text-[#3DFF8F] border-[#3DFF8F]/50 shadow-[0_0_8px_rgba(61,255,143,0.25)]'
                                            : isOut
                                            ? 'bg-[#19B8C9]/20 text-[#19B8C9] border-[#19B8C9]/50 shadow-[0_0_8px_rgba(25,184,201,0.25)]'
                                            : 'bg-[#FFC247]/20 text-[#FFC247] border-[#FFC247]/50 shadow-[0_0_8px_rgba(255,194,71,0.25)]'
                                        }`}
                                      >
                                        <button
                                          onClick={() => toggleCycleStepType(idx)}
                                          className="cursor-pointer hover:underline"
                                          title="Click to toggle OUT -> PUSH -> IN"
                                        >
                                          {idx + 1}: {step}
                                        </button>
                                        <button
                                          onClick={() => removeCycleStep(idx)}
                                          className="p-0.5 rounded text-[#7C88A6] hover:text-[#FF4458] cursor-pointer"
                                          title="Remove this lap"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Quick Add Buttons & Direct Text Input */}
                                <div className="flex items-center justify-between gap-3 pt-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-[#7C88A6] uppercase">Add Step:</span>
                                    <button
                                      onClick={() => addCycleStep('push')}
                                      className="px-2 py-0.5 rounded bg-[#3DFF8F]/20 border border-[#3DFF8F]/50 text-[#3DFF8F] text-[10px] font-bold hover:bg-[#3DFF8F]/30 cursor-pointer"
                                    >
                                      + Push
                                    </button>
                                    <button
                                      onClick={() => addCycleStep('out')}
                                      className="px-2 py-0.5 rounded bg-[#19B8C9]/20 border border-[#19B8C9]/50 text-[#19B8C9] text-[10px] font-bold hover:bg-[#19B8C9]/30 cursor-pointer"
                                    >
                                      + Out
                                    </button>
                                    <button
                                      onClick={() => addCycleStep('in')}
                                      className="px-2 py-0.5 rounded bg-[#FFC247]/20 border border-[#FFC247]/50 text-[#FFC247] text-[10px] font-bold hover:bg-[#FFC247]/30 cursor-pointer"
                                    >
                                      + In
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-2 flex-1 max-w-xs">
                                    <input
                                      type="text"
                                      value={cycleSequence.join(', ')}
                                      onChange={(e) => {
                                        const parsed = e.target.value
                                          .split(',')
                                          .map((s) => s.trim().toLowerCase())
                                          .filter(Boolean);
                                        updateCycleSequence(parsed);
                                      }}
                                      className="w-full bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded px-2 py-0.5 text-[10px] outline-none focus:border-[#19B8C9]"
                                      placeholder="out, push, in, out, push, in"
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : param.type === 'boolean' ? (
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => setParamValue(param.key, !val)}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase cursor-pointer ${
                                    val ? 'bg-[#19B8C9] text-black' : 'bg-[#07090F] text-[#7C88A6]'
                                  }`}
                                >
                                  {val ? 'TRUE' : 'FALSE'}
                                </button>
                                {param.hot && runState === 'running' && (
                                  <button
                                    onClick={() => applyHotParam(param.key)}
                                    className="px-2 py-0.5 rounded bg-[#3DFF8F]/20 border border-[#3DFF8F]/50 text-[#3DFF8F] text-[9px] font-bold hover:bg-[#3DFF8F]/30 transition-all cursor-pointer"
                                  >
                                    Apply Now
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2">
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
                                    className="w-32 bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded px-2 py-0.5 text-xs text-right outline-none focus:border-[#19B8C9]"
                                  />
                                  <span className="text-[10px] text-[#7C88A6]">{param.unit}</span>
                                </div>

                                {param.hot && runState === 'running' && (
                                  <button
                                    onClick={() => applyHotParam(param.key)}
                                    className="px-2 py-0.5 rounded bg-[#3DFF8F]/20 border border-[#3DFF8F]/50 text-[#3DFF8F] text-[9px] font-bold hover:bg-[#3DFF8F]/30 transition-all cursor-pointer"
                                  >
                                    Apply Now
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Custom Values Group (Dynamic list passed to learner under custom) */}
            <div className="p-3.5 rounded-[14px] bg-[#0D111A] border-2 border-[#1E2740] space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-[#1E2740]">
                <span className="text-xs font-bold text-[#8B6CFF] uppercase tracking-wider">
                  Custom Learner Variables (Passed under custom.*)
                </span>
                <span className="text-[10px] text-[#7C88A6]">Dynamic parameter extensions</span>
              </div>

              {customParams.length === 0 ? (
                <div className="text-xs text-[#7C88A6] italic py-2 text-center">
                  No custom parameters defined. Click "Add Custom Variable" above.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {customParams.map((cp) => (
                    <div
                      key={cp.key}
                      className="p-2.5 rounded-xl bg-[#121826] border border-[#1E2740] flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-[#8B6CFF]">{cp.key}</span>
                        <button
                          onClick={() => removeCustomParam(cp.key)}
                          className="text-[#7C88A6] hover:text-[#FF4458] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[10px] text-[#7C88A6] my-1 truncate">{cp.description}</div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#1E2740]/60 text-xs">
                        <span className="text-[10px] text-[#7C88A6] uppercase">{cp.type}</span>
                        <span className="text-[#3DFF8F] font-bold">{String(cp.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Custom Parameter Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-[480px] bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E2740] pb-2">
              <span className="font-bold text-sm text-[#D7DEEC] uppercase">Add Custom Variable</span>
              <button onClick={() => setShowAddCustomModal(false)} className="text-[#7C88A6] hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] text-[#7C88A6] uppercase">Key (identifier):</label>
                <input
                  type="text"
                  placeholder="e.g. aero_balance_bias"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded px-2 py-1 text-xs outline-none focus:border-[#19B8C9]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#7C88A6] uppercase">Type:</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-[#07090F] border border-[#1E2740] text-[#19B8C9] rounded px-2 py-1 text-xs"
                  >
                    <option value="float">Float</option>
                    <option value="int">Integer</option>
                    <option value="bool">Boolean</option>
                    <option value="string">String</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#7C88A6] uppercase">Initial Value:</label>
                  <input
                    type="text"
                    value={newVal}
                    onChange={(e) => setNewVal(e.target.value)}
                    className="w-full bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded px-2 py-1 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#7C88A6] uppercase">Description:</label>
                <input
                  type="text"
                  placeholder="What does this variable tune?"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded px-2 py-1 text-xs outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-[#7C88A6]">Hot Modifiable (Apply live):</span>
                <input
                  type="checkbox"
                  checked={newHot}
                  onChange={(e) => setNewHot(e.target.checked)}
                  className="accent-[#19B8C9] cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={handleCreateCustom}
                className="flex-1 py-2 bg-[#19B8C9] text-black font-bold text-xs rounded-xl cursor-pointer"
              >
                Add Variable
              </button>
              <button
                onClick={() => setShowAddCustomModal(false)}
                className="px-4 py-2 bg-[#121826] border border-[#1E2740] text-xs text-[#7C88A6] rounded-xl cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
