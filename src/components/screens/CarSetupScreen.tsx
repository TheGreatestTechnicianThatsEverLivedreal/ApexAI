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
import { F1CarCrossSectionSVG, F1TyreCornerZoomSVG } from '../common/F1CarSetupDrawings.tsx';

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
  const [selectedCorner, setSelectedCorner] = useState<'FL' | 'FR' | 'RL' | 'RR'>('FL');

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
      { key: 'front_wing', label: 'Front Wing Aero Angle', min: 1, max: 11, step: 1, unit: '°', defaultVal: 7 },
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
    <div className="flex-1 h-screen overflow-y-auto overflow-x-hidden flex flex-col p-4 bg-[#07090F] select-none font-mono">
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

      {/* Lower Panels: Blank Grey 2025 F1 Car Setup Studio (Left) & Corner Tyre Zoom (Right) */}
      <div className="flex-1 min-h-[380px] grid grid-cols-2 gap-3">
        {/* Lower Left: Blank Matte-Grey F1 Car Setup Render with Subsystem Dynamic Zoom */}
        <div className="p-3 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between overflow-hidden relative shadow-[0_0_15px_rgba(25,184,201,0.06)]">
          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#1E2740] z-10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#D7DEEC] uppercase">BLANK GREY F1 CHASSIS STUDIO</span>
              <span className="px-1.5 py-0.5 rounded bg-[#19B8C9]/20 text-[#19B8C9] text-[9px] font-bold">
                COMPONENT ZOOM
              </span>
            </div>
            <span className="text-[10px] text-[#19B8C9] font-bold font-mono">
              Focus: {tabs.find((t) => t.id === activeTab)?.label}
            </span>
          </div>

          {/* Clean Neutral Matte Grey Car Vector - No Menus, Camera Zooms In on Subsystem */}
          <div className="flex-1 min-h-[260px] relative my-1.5 rounded-xl overflow-hidden bg-[#07090F] border border-[#1E2740] flex items-center justify-center p-2">
            <F1CarCrossSectionSVG activeTab={activeTab} carSetupValues={carSetupValues} />
          </div>

          <div className="text-[10px] text-[#7C88A6] flex items-center justify-between pt-1">
            <span>2025 Technical Spec (Ground-Effect Venturi Tunnels)</span>
            <span className="text-[#3DFF8F] font-mono">Dynamic Camera Zoom: Active</span>
          </div>
        </div>

        {/* Lower Right: F1 Corner Assembly Zoom (Front 305mm vs Wide Rear 405mm Tyre Context) */}
        <div className="p-3 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between overflow-hidden relative shadow-[0_0_15px_rgba(255,194,71,0.06)]">
          <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#1E2740] z-10">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#D7DEEC] uppercase">Tyre & Suspension Corner Zoom</span>
              <span className="text-[10px] text-[#FFC247] font-bold">
                {selectedCorner === 'FL' || selectedCorner === 'FR' ? 'Front Corner (305mm Slick)' : 'Rear Corner (405mm Wide Slick)'}
              </span>
            </div>

            {/* Corner Selector Buttons (FL / FR / RL / RR) */}
            <div className="flex p-0.5 rounded-lg bg-[#07090F] border border-[#1E2740]">
              {(['FL', 'FR', 'RL', 'RR'] as const).map((corner) => (
                <button
                  key={corner}
                  onClick={() => setSelectedCorner(corner)}
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded cursor-pointer transition-all ${
                    selectedCorner === corner
                      ? 'bg-[#19B8C9] text-black shadow-[0_0_8px_#19B8C9]'
                      : 'text-[#7C88A6] hover:text-[#D7DEEC]'
                  }`}
                  title={`Focus on ${corner} corner tyre & suspension`}
                >
                  {corner}
                </button>
              ))}
            </div>
          </div>

          {/* Clean Vector Tyre & Suspension Geometry - Authentic Dimensions */}
          <div className="flex-1 min-h-[260px] relative my-1.5 rounded-xl overflow-hidden bg-[#07090F] border border-[#1E2740] flex items-center justify-center p-2">
            <F1TyreCornerZoomSVG corner={selectedCorner} carSetupValues={carSetupValues} activeTab={activeTab} />
          </div>

          <div className="text-[10px] text-[#7C88A6] flex items-center justify-between pt-1 font-mono">
            <span>{selectedCorner.startsWith('F') ? 'Front: 305/670-18 Low-Profile' : 'Rear: 405/670-18 Wide Contact Patch'}</span>
            <span className="text-[#19B8C9]">Active Corner: {selectedCorner}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
