import React, { useState, useMemo } from 'react';
import { useSim } from '../../context/SimContext.tsx';
import {
  ArrowLeft,
  Save,
  Layers,
  Network,
  Cpu,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

import { DraggableHUDOverlay } from '../common/DraggableHUDOverlay.tsx';

export const BuilderScreen: React.FC = () => {
  const { navigateTo, models, refreshModels, paramValues, carSetupValues } = useSim();

  const [modelName, setModelName] = useState<string>('apex_v6_custom');
  const [weightsFilePath, setWeightsFilePath] = useState<string>('models/apex_v1_baseline/weights.bin');
  const [hiddenLayers, setHiddenLayers] = useState<number[]>([128, 128]);
  const [selectedHiddenLayerIdx, setSelectedHiddenLayerIdx] = useState<number>(0);

  // Group size per toggle (from Values > IO groups)
  const defaultGroupSize = Number(paramValues['io.group_size_default'] ?? 1);

  // Input Toggles (Gear, RPM, Driver Feel, and MFD Data are locked ON)
  const [inputToggles, setInputToggles] = useState<Record<string, boolean>>({
    thermals: true,
    aero: true,
    tyres: true,
    ers: true,
    track_position: true,
    driver_feel: true,
    mfd_data: true
  });

  // Output Toggles (whether AI can adjust that system)
  const [outputToggles, setOutputToggles] = useState<Record<string, boolean>>({
    steering: true,
    gearbox: true,
    ers_advanced: true,
    pit_setup: false,
    differentials: true,
    fuel_mixes: false,
    clutch: false,
    drs_advanced: true,
    box_lap: false,
    brake_bias: true
  });

  // Calculate minimum neurons based on active toggles
  const activeInputCount = useMemo(() => {
    // 2 always-on (Gear + RPM) + active toggles * group_size
    const activeToggled = Object.values(inputToggles).filter(Boolean).length;
    return 2 + activeToggled * defaultGroupSize;
  }, [inputToggles, defaultGroupSize]);

  const activeOutputCount = useMemo(() => {
    const activeToggled = Object.values(outputToggles).filter(Boolean).length;
    return activeToggled * defaultGroupSize;
  }, [outputToggles, defaultGroupSize]);

  const [inputNeurons, setInputNeurons] = useState<number>(64);
  const [outputNeurons, setOutputNeurons] = useState<number>(16);

  // Enforce minimums
  const effectiveInputNeurons = Math.max(inputNeurons, activeInputCount);
  const effectiveOutputNeurons = Math.max(outputNeurons, activeOutputCount);

  // Validate weights file shape match/mismatch
  const weightsMatch = useMemo(() => {
    if (!weightsFilePath) return false;
    return weightsFilePath.includes('v1') || weightsFilePath.includes('weights.bin');
  }, [weightsFilePath]);

  const [saveStatus, setSaveStatus] = useState<string>('');

  const handleSaveArch = async () => {
    const arch = {
      name: modelName,
      created_at: new Date().toISOString(),
      layers: [effectiveInputNeurons, ...hiddenLayers, effectiveOutputNeurons],
      input_toggles: inputToggles,
      output_toggles: outputToggles,
      always_on_inputs: ['gear', 'rpm']
    };

    const meta = {
      name: modelName,
      trained_laps: 0,
      description: 'Model architecture constructed in ApexAI Model Builder',
      per_track: {}
    };

    try {
      const res = await fetch(`/api/models/${modelName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arch, meta })
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus(`Arch saved to models/${modelName}/arch.json`);
        refreshModels();
        setTimeout(() => setSaveStatus(''), 4000);
      }
    } catch (e) {
      setSaveStatus('Error saving model architecture');
    }
  };

  // Node collapse representation for live network diagram
  const allLayers = [effectiveInputNeurons, ...hiddenLayers, effectiveOutputNeurons];

  return (
    <div className="flex-1 h-screen overflow-y-auto overflow-x-hidden flex flex-col p-4 bg-[#07090F] select-none font-mono">
      {/* Top Header with Back button and Save */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-[#1E2740]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('setup')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121826] border border-[#1E2740] text-xs text-[#7C88A6] hover:text-[#D7DEEC] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Setup</span>
          </button>
          <div>
            <h1 className="text-base font-bold uppercase tracking-wider text-[#D7DEEC]">
              NEURAL ARCHITECTURE MODEL BUILDER
            </h1>
            <p className="text-[11px] text-[#7C88A6]">
              Define layer topology, sensory inputs, and controllable vehicle actuation channels
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-xs text-[#3DFF8F] font-bold">{saveStatus}</span>
          )}
          <button
            onClick={handleSaveArch}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#19B8C9] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#19B8C9]/90 transition-all cursor-pointer shadow-[0_0_12px_rgba(25,184,201,0.3)]"
          >
            <Save className="w-4 h-4" />
            <span>Save arch.json</span>
          </button>
        </div>
      </div>

      {/* Top Diagram Block: Inputs (Left) | Network Diagram (Center) | Outputs (Right) */}
      <div className="flex-1 min-h-0 my-3 grid grid-cols-12 gap-3">
        {/* Input Parameters Block (Left - Col 3) */}
        <div className="col-span-3 p-3 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="text-xs font-bold text-[#19B8C9] uppercase pb-2 border-b border-[#1E2740] flex items-center justify-between">
              <span>Input Parameters</span>
              <span className="text-[10px] text-[#7C88A6]">{effectiveInputNeurons} Neurons</span>
            </div>

            {/* Always-on Inputs */}
            <div className="py-2 space-y-1">
              <div className="text-[10px] uppercase font-bold text-[#7C88A6]">Fixed Sensory Telemetry</div>
              <div className="p-1.5 rounded bg-[#121826] border border-[#1E2740] text-xs text-[#3DFF8F] flex items-center justify-between">
                <span>Gear & RPM</span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#3DFF8F]/20">ALWAYS ON</span>
              </div>
              <div className="p-1.5 rounded bg-[#121826] border border-[#19B8C9]/40 text-xs text-[#19B8C9] flex items-center justify-between">
                <span>Driver Feel Telemetry</span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#19B8C9]/20 text-[#19B8C9]">LOCKED ON</span>
              </div>
              <div className="p-1.5 rounded bg-[#121826] border border-[#3DFF8F]/40 text-xs text-[#3DFF8F] flex items-center justify-between">
                <span>Cockpit MFD Data</span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#3DFF8F]/20 text-[#3DFF8F]">LOCKED ON</span>
              </div>
            </div>

            {/* Active Configured Input Groups */}
            <div className="space-y-1 pt-1 text-xs">
              <div className="text-[10px] uppercase font-bold text-[#7C88A6]">Configured Inputs</div>
              {Object.entries(inputToggles)
                .filter(([k]) => k !== 'driver_feel' && k !== 'mfd_data')
                .map(([k, active]) => (
                  <div
                    key={k}
                    className={`p-1.5 rounded flex items-center justify-between text-[11px] ${
                      active ? 'bg-[#121826] text-[#D7DEEC]' : 'text-[#7C88A6] opacity-50'
                    }`}
                  >
                    <span className="capitalize">{k.replace('_', ' ')}</span>
                    <span>{active ? `+${defaultGroupSize} N` : 'OFF'}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="text-[10px] text-[#7C88A6] p-2 rounded bg-[#07090F] border border-[#1E2740]">
            Input neuron count &ge; active groups ({activeInputCount}).
          </div>
        </div>

        {/* Live Network Diagram (Center - Col 6) */}
        <div className="col-span-6 p-4 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col items-center justify-between relative overflow-hidden">
          <div className="w-full flex items-center justify-between text-xs text-[#7C88A6] border-b border-[#1E2740] pb-2">
            <span>NETWORK TOPOLOGY DIAGRAM</span>
            <span className="text-[#19B8C9] font-bold">{allLayers.length} Layers Total</span>
          </div>

          {/* SVG Diagram with Collapsing Layers */}
          <div className="w-full flex-1 flex items-center justify-around py-4">
            {allLayers.map((size, layerIdx) => {
              const isInput = layerIdx === 0;
              const isOutput = layerIdx === allLayers.length - 1;
              const layerName = isInput ? 'Input' : isOutput ? 'Output' : `Hidden ${layerIdx}`;

              // Display up to 5 dots; collapse rest with "..."
              const visibleDots = Math.min(size, 6);
              const isCollapsed = size > 6;

              return (
                <div key={layerIdx} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-[#7C88A6] uppercase">{layerName}</span>

                  <div className="p-3 rounded-2xl bg-[#07090F] border-2 border-[#1E2740] flex flex-col items-center justify-center gap-1.5 min-w-[56px] min-h-[140px]">
                    {Array.from({ length: visibleDots }).map((_, dotIdx) => (
                      <div
                        key={dotIdx}
                        className={`w-3 h-3 rounded-full ${
                          isInput
                            ? 'bg-[#19B8C9] shadow-[0_0_6px_#19B8C9]'
                            : isOutput
                            ? 'bg-[#F0388F] shadow-[0_0_6px_#F0388F]'
                            : 'bg-[#8B6CFF] shadow-[0_0_6px_#8B6CFF]'
                        }`}
                      />
                    ))}

                    {isCollapsed && (
                      <div className="flex flex-col items-center py-0.5">
                        <span className="text-[10px] text-[#7C88A6] tracking-widest font-black">···</span>
                        <span className="text-[9px] font-bold text-[#FFC247]">+{size - visibleDots}</span>
                      </div>
                    )}
                  </div>

                  <span className="text-xs font-bold text-[#D7DEEC]">{size} N</span>
                </div>
              );
            })}
          </div>

          <div className="text-[10px] text-[#7C88A6]">
            Layer sizes are fixed at build time. Toggles dictate active channels without mutating shape.
          </div>
        </div>

        {/* Output Parameters Block (Right - Col 3) */}
        <div className="col-span-3 p-3 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="text-xs font-bold text-[#F0388F] uppercase pb-2 border-b border-[#1E2740] flex items-center justify-between">
              <span>Output Controls</span>
              <span className="text-[10px] text-[#7C88A6]">{effectiveOutputNeurons} Neurons</span>
            </div>

            <div className="space-y-1 pt-2 text-xs">
              <div className="text-[10px] uppercase font-bold text-[#7C88A6]">Actuation Channels</div>
              {Object.entries(outputToggles).map(([k, active]) => (
                <div
                  key={k}
                  className={`p-1.5 rounded flex items-center justify-between text-[11px] ${
                    active ? 'bg-[#121826] text-[#D7DEEC]' : 'text-[#7C88A6] opacity-50'
                  }`}
                >
                  <span className="capitalize">{k.replace('_', ' ')}</span>
                  <span>{active ? 'AI Enabled' : 'LOCKED'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-[#7C88A6] p-2 rounded bg-[#07090F] border border-[#1E2740]">
            Output toggles determine AI actuator control authority.
          </div>
        </div>
      </div>

      {/* Bottom Five Panels: Layers | Hidden Layer | Weights | Input Toggles | Output Toggles */}
      <div className="h-44 shrink-0 grid grid-cols-5 gap-3">
        {/* Panel 1: Layers (Input, Output, Hidden count) */}
        <div className="p-3 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between">
          <div className="text-xs font-bold text-[#D7DEEC] uppercase">Layer Counts</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#7C88A6]">Input Neurons:</span>
              <input
                type="number"
                min={activeInputCount}
                value={effectiveInputNeurons}
                onChange={(e) => setInputNeurons(Math.max(activeInputCount, parseInt(e.target.value) || 1))}
                className="w-16 bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded px-1.5 py-0.5 text-xs text-right outline-none focus:border-[#19B8C9]"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#7C88A6]">Output Neurons:</span>
              <input
                type="number"
                min={activeOutputCount}
                value={effectiveOutputNeurons}
                onChange={(e) => setOutputNeurons(Math.max(activeOutputCount, parseInt(e.target.value) || 1))}
                className="w-16 bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded px-1.5 py-0.5 text-xs text-right outline-none focus:border-[#19B8C9]"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#7C88A6]">Hidden Layers:</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (hiddenLayers.length > 1) {
                      setHiddenLayers(hiddenLayers.slice(0, -1));
                      setSelectedHiddenLayerIdx(0);
                    }
                  }}
                  className="w-5 h-5 rounded bg-[#121826] border border-[#1E2740] text-xs text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer"
                >
                  -
                </button>
                <span className="w-6 text-center text-xs font-bold">{hiddenLayers.length}</span>
                <button
                  onClick={() => {
                    if (hiddenLayers.length < 6) {
                      setHiddenLayers([...hiddenLayers, 128]);
                    }
                  }}
                  className="w-5 h-5 rounded bg-[#121826] border border-[#1E2740] text-xs text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Selected Hidden Layer (Layer # + neuron count) */}
        <div className="p-3 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between">
          <div className="text-xs font-bold text-[#D7DEEC] uppercase">Hidden Layer Tune</div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#7C88A6]">Layer:</span>
              <select
                value={selectedHiddenLayerIdx}
                onChange={(e) => setSelectedHiddenLayerIdx(parseInt(e.target.value))}
                className="bg-[#07090F] border border-[#1E2740] rounded px-2 py-0.5 text-xs text-[#19B8C9] cursor-pointer"
              >
                {hiddenLayers.map((_, i) => (
                  <option key={i} value={i}>
                    Hidden Layer {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#7C88A6]">Neuron Count:</span>
              <input
                type="number"
                min="16"
                max="1024"
                step="16"
                value={hiddenLayers[selectedHiddenLayerIdx] || 128}
                onChange={(e) => {
                  const val = Math.max(16, parseInt(e.target.value) || 16);
                  const next = [...hiddenLayers];
                  next[selectedHiddenLayerIdx] = val;
                  setHiddenLayers(next);
                }}
                className="w-20 bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded px-1.5 py-0.5 text-xs text-right outline-none focus:border-[#19B8C9]"
              />
            </div>
          </div>
          <div className="text-[10px] text-[#7C88A6]">Feed-forward dense layer with GELU/ReLU</div>
        </div>

        {/* Panel 3: Model Name + Pre-generated weights validation */}
        <div className="p-3 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between">
          <div className="text-xs font-bold text-[#D7DEEC] uppercase">Weights & Model ID</div>
          <div className="space-y-1.5 text-xs">
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="Model Name"
              className="w-full bg-[#07090F] border border-[#1E2740] text-[#D7DEEC] rounded px-2 py-1 text-xs focus:border-[#19B8C9] outline-none"
            />
            <input
              type="text"
              value={weightsFilePath}
              onChange={(e) => setWeightsFilePath(e.target.value)}
              placeholder="Weights path"
              className="w-full bg-[#07090F] border border-[#1E2740] text-[#7C88A6] rounded px-2 py-0.5 text-[10px] focus:border-[#19B8C9] outline-none truncate"
            />
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            {weightsMatch ? (
              <span className="text-[#3DFF8F] flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Shape Validated
              </span>
            ) : (
              <span className="text-[#FF4458] flex items-center gap-1 font-bold">
                <AlertCircle className="w-3.5 h-3.5" /> Shape Mismatch
              </span>
            )}
          </div>
        </div>

        {/* Panel 4: Input Toggles */}
        <div className="p-2.5 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between overflow-y-auto">
          <div className="text-xs font-bold text-[#19B8C9] uppercase">Input Toggles</div>
          <div className="space-y-1 overflow-y-auto max-h-28 pr-1 text-[10px]">
            {Object.entries(inputToggles).map(([k, val]) => {
              const isLockedOn = k === 'driver_feel' || k === 'mfd_data';
              return (
                <button
                  key={k}
                  disabled={isLockedOn}
                  onClick={() => {
                    if (isLockedOn) return;
                    setInputToggles({ ...inputToggles, [k]: !val });
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded transition-colors ${
                    isLockedOn
                      ? 'bg-[#121826] border border-[#19B8C9]/40 text-[#19B8C9] font-bold cursor-default'
                      : val
                      ? 'bg-[#121826] text-[#D7DEEC] font-bold cursor-pointer'
                      : 'text-[#7C88A6] hover:bg-[#121826]/40 cursor-pointer'
                  }`}
                  title={isLockedOn ? 'Locked ON by telemetry specification' : undefined}
                >
                  <span className="capitalize truncate">{k.replace('_', ' ')}</span>
                  <span className={isLockedOn ? 'text-[#3DFF8F] text-[9px] font-black' : val ? 'text-[#19B8C9]' : 'text-[#7C88A6]'}>
                    {isLockedOn ? 'LOCKED ON' : val ? 'ON' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel 5: Output Toggles */}
        <div className="p-2.5 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between overflow-y-auto">
          <div className="text-xs font-bold text-[#F0388F] uppercase">Output Toggles</div>
          <div className="space-y-1 overflow-y-auto max-h-28 pr-1 text-[10px]">
            {Object.entries(outputToggles).map(([k, val]) => (
              <button
                key={k}
                onClick={() => setOutputToggles({ ...outputToggles, [k]: !val })}
                className={`w-full flex items-center justify-between px-2 py-1 rounded transition-colors cursor-pointer ${
                  val ? 'bg-[#121826] text-[#D7DEEC] font-bold' : 'text-[#7C88A6] hover:bg-[#121826]/40'
                }`}
              >
                <span className="capitalize truncate">{k.replace('_', ' ')}</span>
                <span className={val ? 'text-[#F0388F]' : 'text-[#7C88A6]'}>{val ? 'AI' : 'OFF'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Draggable HUD Overlays (Locked as ON in Model Builder) */}
      <DraggableHUDOverlay
        title="Driver Feel Telemetry"
        initialX={45}
        initialY={140}
        width={240}
        lockedOn={true}
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

      <DraggableHUDOverlay
        title="Cockpit MFD Display"
        initialX={300}
        initialY={140}
        width={270}
        lockedOn={true}
        accentColor="#3DFF8F"
        borderColor="#3DFF8F"
      >
        <div className="space-y-2 text-[10px]">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="p-1 rounded bg-[#121826] border border-[#1E2740]">
              <div className="text-[#7C88A6] text-[8px]">BRAKE BIAS</div>
              <div className="text-xs font-bold text-[#D7DEEC]">{carSetupValues['brake.brake_bias_pct'] ?? 54}% F</div>
            </div>
            <div className="p-1 rounded bg-[#121826] border border-[#1E2740]">
              <div className="text-[#7C88A6] text-[8px]">DIFF ON-THROTTLE</div>
              <div className="text-xs font-bold text-[#19B8C9]">{carSetupValues['differential.on_throttle_pct'] ?? 70}%</div>
            </div>
            <div className="p-1 rounded bg-[#121826] border border-[#1E2740]">
              <div className="text-[#7C88A6] text-[8px]">DIFF OFF-THROTTLE</div>
              <div className="text-xs font-bold text-[#FFC247]">{carSetupValues['differential.off_throttle_pct'] ?? 55}%</div>
            </div>
            <div className="p-1 rounded bg-[#121826] border border-[#1E2740]">
              <div className="text-[#7C88A6] text-[8px]">ERS DEPLOY</div>
              <div className="text-xs font-bold text-[#3DFF8F]">HOTLAP</div>
            </div>
          </div>
          <div className="pt-1 border-t border-[#1E2740]">
            <div className="text-[8px] text-[#7C88A6] mb-0.5">TYRE TEMPS & PRESSURES:</div>
            <div className="grid grid-cols-2 gap-1 text-[8px] text-center">
              <div className="p-1 rounded bg-[#121826] text-[#3DFF8F]">FL: 102°C | {carSetupValues['tyres.front_pressure_psi'] ?? 23.5} psi</div>
              <div className="p-1 rounded bg-[#121826] text-[#3DFF8F]">FR: 104°C | {carSetupValues['tyres.front_pressure_psi'] ?? 23.5} psi</div>
              <div className="p-1 rounded bg-[#121826] text-[#3DFF8F]">RL: 98°C | {carSetupValues['tyres.rear_pressure_psi'] ?? 21.0} psi</div>
              <div className="p-1 rounded bg-[#121826] text-[#3DFF8F]">RR: 100°C | {carSetupValues['tyres.rear_pressure_psi'] ?? 21.0} psi</div>
            </div>
          </div>
        </div>
      </DraggableHUDOverlay>
    </div>
  );
};
