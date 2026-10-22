import React, { useState } from 'react';
import { useSim } from '../../context/SimContext.tsx';
import {
  ArrowLeft,
  RotateCcw,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Shield,
  Gauge
} from 'lucide-react';

export const CarSetupScreen: React.FC = () => {
  const { navigateTo, carSetupValues, setCarSetupValue, resetCarSetupTab } = useSim();

  const tabs = [
    { id: 'suspension', label: 'Suspension' },
    { id: 'tyres', label: 'Tyre Pressure' },
    { id: 'arb', label: 'Anti-Roll Bars' },
    { id: 'ride_height', label: 'Ride Height' },
    { id: 'wings', label: 'Wing Angles' },
    { id: 'fuel', label: 'Fuel Load' },
    { id: 'differential', label: 'Differentials' },
    { id: 'brake', label: 'Brake' },
    { id: 'toe_camber', label: 'Toe & Camber' }
  ];

  const [activeTab, setActiveTab] = useState<string>('suspension');

  // Parameter definitions per tab
  const tabParamsMap: Record<string, { key: string; label: string; min: number; max: number; step: number; unit: string; defaultVal: number }[]> = {
    suspension: [
      { key: 'front_springs', label: 'Front Suspension Springs', min: 1, max: 11, step: 1, unit: '', defaultVal: 8 },
      { key: 'rear_springs', label: 'Rear Suspension Springs', min: 1, max: 11, step: 1, unit: '', defaultVal: 6 },
      { key: 'front_bump', label: 'Front Bump Stop / Damper', min: 1, max: 11, step: 1, unit: '', defaultVal: 5 },
      { key: 'rear_bump', label: 'Rear Bump Stop / Damper', min: 1, max: 11, step: 1, unit: '', defaultVal: 4 }
    ],
    tyres: [
      { key: 'front_pressure_psi', label: 'Front Tyre Pressure', min: 21.0, max: 25.5, step: 0.1, unit: 'psi', defaultVal: 23.5 },
      { key: 'rear_pressure_psi', label: 'Rear Tyre Pressure', min: 19.5, max: 23.5, step: 0.1, unit: 'psi', defaultVal: 21.0 }
    ],
    arb: [
      { key: 'front_anti_roll_bar', label: 'Front Anti-Roll Bar', min: 1, max: 11, step: 1, unit: '', defaultVal: 7 },
      { key: 'rear_anti_roll_bar', label: 'Rear Anti-Roll Bar', min: 1, max: 11, step: 1, unit: '', defaultVal: 5 }
    ],
    ride_height: [
      { key: 'front', label: 'Front Ride Height', min: 1, max: 11, step: 1, unit: 'mm', defaultVal: 3 },
      { key: 'rear', label: 'Rear Ride Height', min: 1, max: 11, step: 1, unit: 'mm', defaultVal: 6 }
    ],
    wings: [
      { key: 'front_wing', label: 'Front Wing Aero Aero Angle', min: 1, max: 11, step: 1, unit: '°', defaultVal: 7 },
      { key: 'rear_wing', label: 'Rear Wing Aero Angle', min: 1, max: 11, step: 1, unit: '°', defaultVal: 8 }
    ],
    fuel: [
      { key: 'initial_load_kg', label: 'Initial Race/Stint Fuel Load', min: 5.0, max: 110.0, step: 0.5, unit: 'kg', defaultVal: 12.5 }
    ],
    differential: [
      { key: 'on_throttle_pct', label: 'Differential On-Throttle', min: 50, max: 100, step: 1, unit: '%', defaultVal: 70 },
      { key: 'off_throttle_pct', label: 'Differential Off-Throttle', min: 50, max: 100, step: 1, unit: '%', defaultVal: 55 }
    ],
    brake: [
      { key: 'brake_pressure_pct', label: 'Brake Hydraulic Pressure', min: 80, max: 100, step: 1, unit: '%', defaultVal: 95 },
      { key: 'brake_bias_pct', label: 'Front Brake Bias', min: 50, max: 70, step: 1, unit: '%', defaultVal: 54 }
    ],
    toe_camber: [
      { key: 'front_camber_deg', label: 'Front Camber Angle', min: -3.5, max: -2.0, step: 0.1, unit: '°', defaultVal: -2.8 },
      { key: 'rear_camber_deg', label: 'Rear Camber Angle', min: -2.0, max: -1.0, step: 0.1, unit: '°', defaultVal: -1.4 },
      { key: 'front_toe_deg', label: 'Front Toe-Out Angle', min: 0.05, max: 0.15, step: 0.01, unit: '°', defaultVal: 0.08 },
      { key: 'rear_toe_deg', label: 'Rear Toe-In Angle', min: 0.20, max: 0.50, step: 0.01, unit: '°', defaultVal: 0.24 }
    ]
  };

  const currentParams = tabParamsMap[activeTab] || [];

  // Active parameter values for highlighting
  const frontWing = carSetupValues['wings.front_wing'] ?? 7;
  const rearWing = carSetupValues['wings.rear_wing'] ?? 8;
  const frontHeight = carSetupValues['ride_height.front'] ?? 3;
  const rearHeight = carSetupValues['ride_height.rear'] ?? 6;
  const frontCamber = carSetupValues['toe_camber.front_camber_deg'] ?? -2.8;
  const frontToe = carSetupValues['toe_camber.front_toe_deg'] ?? 0.08;

  return (
    <div className="flex-1 h-screen flex flex-col p-4 bg-[#07090F] overflow-hidden select-none font-mono">
      {/* Top Header */}
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
              VEHICLE MECHANICAL & AERO CAR SETUP
            </h1>
            <p className="text-[11px] text-[#7C88A6]">
              F1 2020 layout: Tune vehicle dynamics, kinematics, ballast, and aero balances
            </p>
          </div>
        </div>

        <button
          onClick={() => resetCarSetupTab(activeTab)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#121826] border border-[#1E2740] text-xs text-[#7C88A6] hover:text-[#D7DEEC] transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Tab Defaults</span>
        </button>
      </div>

      {/* Tabs Strip */}
      <div className="flex gap-1.5 my-3 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#121826] text-[#19B8C9] border-b-2 border-[#19B8C9] shadow-[0_0_10px_rgba(25,184,201,0.2)]'
                  : 'bg-[#0D111A] text-[#7C88A6] border border-[#1E2740] hover:text-[#D7DEEC]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Upper Panel: Parameter rows with steppers and default markers */}
      <div className="p-4 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] space-y-3 mb-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          {currentParams.map((param) => {
            const fullKey = `${activeTab}.${param.key}`;
            const val = carSetupValues[fullKey] !== undefined ? carSetupValues[fullKey] : param.defaultVal;
            const isDefault = Math.abs(val - param.defaultVal) < 1e-4;

            return (
              <div
                key={param.key}
                className="p-2.5 rounded-xl bg-[#121826] border border-[#1E2740] flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-[#D7DEEC]">{param.label}</div>
                  <div className="flex items-center gap-2 text-[10px] text-[#7C88A6]">
                    <span>Default: {param.defaultVal}{param.unit}</span>
                    {isDefault ? (
                      <span className="text-[#3DFF8F] font-semibold">● Default</span>
                    ) : (
                      <span className="text-[#FFC247] font-semibold">● Modified</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-[#07090F] border border-[#1E2740] rounded-xl p-0.5">
                    <button
                      onClick={() => {
                        const next = Math.max(param.min, Number((val - param.step).toFixed(2)));
                        setCarSetupValue(activeTab, param.key, next);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#7C88A6] hover:text-[#D7DEEC] hover:bg-[#121826] cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="w-16 text-center font-bold text-xs text-[#19B8C9]">
                      {val.toFixed(param.step < 0.1 ? 2 : param.step < 1 ? 1 : 0)}
                      {param.unit}
                    </div>

                    <button
                      onClick={() => {
                        const next = Math.min(param.max, Number((val + param.step).toFixed(2)));
                        setCarSetupValue(activeTab, param.key, next);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#7C88A6] hover:text-[#D7DEEC] hover:bg-[#121826] cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lower Panels: Structural Car X-Ray (Left) & Tyre Camber/Toe X-Ray (Right) */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-3">
        {/* Lower Left: Side-view Structural Car X-Ray (Original SVG) */}
        <div className="p-3 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-[#1E2740]">
            <span className="font-bold text-[#D7DEEC] uppercase">Structural Vehicle Chassis X-Ray</span>
            <span className="text-[10px] text-[#19B8C9]">
              Active Focus: {tabs.find((t) => t.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center relative">
            <svg viewBox="0 0 600 240" className="w-full h-full max-h-52">
              {/* Ground Plane */}
              <line x1="20" y1="210" x2="580" y2="210" stroke="#1E2740" strokeWidth="2" strokeDasharray="5 5" />

              {/* F1 Car Silhouette Chassis Outline */}
              <path
                d="M 60 180 Q 90 150 140 160 L 220 155 Q 280 120 360 120 L 420 135 L 490 140 Q 530 160 550 175 L 560 190 L 50 190 Z"
                fill="#121826"
                stroke="#2A3554"
                strokeWidth="2"
              />

              {/* Wheels Side-View */}
              <circle cx="130" cy="180" r="32" fill="#07090F" stroke="#3A4668" strokeWidth="4" />
              <circle cx="130" cy="180" r="16" fill="#121826" stroke="#19B8C9" strokeWidth="2" />
              <circle cx="470" cy="180" r="32" fill="#07090F" stroke="#3A4668" strokeWidth="4" />
              <circle cx="470" cy="180" r="16" fill="#121826" stroke="#19B8C9" strokeWidth="2" />

              {/* Front Wing Assembly (Highlighted if activeTab is wings or aero) */}
              <g
                stroke={activeTab === 'wings' ? '#19B8C9' : '#3A4668'}
                strokeWidth="3"
                className="transition-colors duration-300"
              >
                <path d="M 40 185 L 80 180 L 70 170 Z" fill={activeTab === 'wings' ? 'rgba(25,184,201,0.3)' : '#121826'} />
                {activeTab === 'wings' && (
                  <path d="M 60 160 L 60 140 M 55 145 L 60 140 L 65 145" stroke="#3DFF8F" strokeWidth="2.5" />
                )}
              </g>

              {/* Rear Wing Assembly */}
              <g
                stroke={activeTab === 'wings' ? '#19B8C9' : '#3A4668'}
                strokeWidth="3"
                className="transition-colors duration-300"
              >
                <path d="M 520 120 L 570 115 L 565 140 Z" fill={activeTab === 'wings' ? 'rgba(25,184,201,0.3)' : '#121826'} />
              </g>

              {/* Suspension Arms & Springs */}
              <g
                stroke={activeTab === 'suspension' || activeTab === 'arb' ? '#FFC247' : '#2A3554'}
                strokeWidth="2.5"
              >
                <line x1="130" y1="180" x2="190" y2="155" />
                <line x1="130" y1="180" x2="200" y2="175" />
                <line x1="470" y1="180" x2="420" y2="155" />
                <line x1="470" y1="180" x2="410" y2="175" />
                {(activeTab === 'suspension' || activeTab === 'arb') && (
                  <g stroke="#FFC247" strokeWidth="2">
                    <line x1="160" y1="140" x2="160" y2="120" />
                    <polyline points="156,125 160,120 164,125" fill="none" />
                  </g>
                )}
              </g>

              {/* Ride Height Motion Indicators */}
              {activeTab === 'ride_height' && (
                <g stroke="#3DFF8F" strokeWidth="2">
                  <line x1="130" y1="210" x2="130" y2="230" />
                  <line x1="470" y1="210" x2="470" y2="230" />
                  <text x="135" y="225" fill="#3DFF8F" fontSize="10" fontFamily="JetBrains Mono">
                    {frontHeight}mm
                  </text>
                  <text x="475" y="225" fill="#3DFF8F" fontSize="10" fontFamily="JetBrains Mono">
                    {rearHeight}mm
                  </text>
                </g>
              )}
            </svg>
          </div>

          <div className="text-[10px] text-[#7C88A6] flex items-center justify-between">
            <span>Dynamic Structural CAD Overlay</span>
            <span className="text-[#3DFF8F]">Motion Vector Rendering Live</span>
          </div>
        </div>

        {/* Lower Right: Tyre X-Ray (Front View for Camber & Side View for Toe) */}
        <div className="p-3 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-[#1E2740]">
            <span className="font-bold text-[#D7DEEC] uppercase">Tyre Geometry Kinematics</span>
            <span className="text-[10px] text-[#FFC247]">Camber & Toe Analysis</span>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-2 items-center py-1">
            {/* Front View: Negative Camber Angle */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#07090F] border border-[#1E2740] h-full">
              <span className="text-[10px] text-[#7C88A6] uppercase font-bold mb-1">
                Front View (Camber: {frontCamber}°)
              </span>
              <svg viewBox="0 0 160 130" className="w-full max-h-32">
                <line x1="10" y1="110" x2="150" y2="110" stroke="#1E2740" strokeWidth="1.5" />
                {/* Wheel Upright with Live Camber Tilt */}
                <g transform={`rotate(${frontCamber * 2.5}, 80, 110)`}>
                  <rect x="65" y="30" width="30" height="80" rx="6" fill="#121826" stroke="#19B8C9" strokeWidth="2.5" />
                  <line x1="80" y1="30" x2="80" y2="110" stroke="#FF4458" strokeWidth="1.5" strokeDasharray="3 3" />
                </g>
                <text x="80" y="20" fill="#19B8C9" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
                  {frontCamber}° Neg Tilt
                </text>
              </svg>
            </div>

            {/* Top/Side View: Toe-Out / Toe-In */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#07090F] border border-[#1E2740] h-full">
              <span className="text-[10px] text-[#7C88A6] uppercase font-bold mb-1">
                Top View (Toe: {frontToe}°)
              </span>
              <svg viewBox="0 0 160 130" className="w-full max-h-32">
                <line x1="80" y1="10" x2="80" y2="120" stroke="#1E2740" strokeWidth="1.5" strokeDasharray="3 3" />
                {/* Wheel Top Angle */}
                <g transform={`rotate(${frontToe * 25}, 80, 65)`}>
                  <rect x="68" y="25" width="24" height="80" rx="4" fill="#121826" stroke="#3DFF8F" strokeWidth="2.5" />
                  <path d="M 80 20 L 76 26 L 84 26 Z" fill="#3DFF8F" />
                </g>
                <text x="80" y="125" fill="#3DFF8F" fontSize="10" fontFamily="JetBrains Mono" textAnchor="middle">
                  Toe-Out ({frontToe}°)
                </text>
              </svg>
            </div>
          </div>

          <div className="text-[10px] text-[#7C88A6] flex items-center justify-between">
            <span>Contact Patch Optimization</span>
            <span className="text-[#19B8C9]">Live SVG Coordinate Update</span>
          </div>
        </div>
      </div>
    </div>
  );
};
