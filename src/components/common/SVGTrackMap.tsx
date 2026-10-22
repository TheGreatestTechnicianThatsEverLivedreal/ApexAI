import React, { useState } from 'react';
import { CarTelemetry, LapCompleteEvent, TrackData } from '../../types/index.ts';

interface SVGTrackMapProps {
  cars: CarTelemetry[];
  latestLap: LapCompleteEvent | null;
  track?: TrackData;
  runState?: string;
  onStart?: () => void;
}

export const SVGTrackMap: React.FC<SVGTrackMapProps> = ({
  cars,
  latestLap,
  track,
  runState = 'idle',
  onStart
}) => {
  const [showSegmentsOverlay, setShowSegmentsOverlay] = useState<boolean>(true);

  // Silverstone GP Spline Track Path (viewBox 0 0 800 560)
  // S1 (Red): Farm to Arena
  // S2 (Cyan): Brooklands to Copse
  // S3 (Amber): Maggotts/Becketts to Club
  const sector1Path = "M 420 285 C 490 280, 560 250, 610 200 C 650 160, 660 120, 620 90 C 580 60, 500 70, 440 90 C 390 110, 360 140, 320 150";
  const sector2Path = "M 320 150 C 270 160, 200 170, 150 210 C 100 250, 80 320, 110 380 C 140 430, 210 460, 290 470 C 360 480, 440 460, 480 430";
  const sector3Path = "M 480 430 C 530 400, 590 350, 620 300 C 640 260, 630 220, 580 200 C 530 180, 470 210, 430 240 C 400 260, 410 280, 420 285";

  // DRS Zones paths
  const drs1Path = "M 590 220 C 630 180, 645 140, 620 95";
  const drs2Path = "M 290 470 C 360 480, 440 460, 480 430";

  // Car dot palette
  const carColors = ['#19B8C9', '#F0388F', '#3DFF8F', '#FFC247', '#8B6CFF'];

  return (
    <div className="relative w-full h-full bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] p-3 flex flex-col justify-between overflow-hidden shadow-[0_0_12px_rgba(25,184,201,0.08)]">
      {/* Top Header: Track Name, S1/S2/S3 chips, and mini-segments overlay toggle */}
      <div className="flex items-center justify-between z-10 select-none">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs font-bold uppercase tracking-wider text-[#D7DEEC]">
              {track?.name || 'Silverstone GP'}
            </span>
            <span className="text-[10px] text-[#7C88A6] font-mono">
              Circuit Length: {track?.length_m ? `${(track.length_m / 1000).toFixed(3)} km` : '5.891 km'} | 25 Mini-Segments
            </span>
          </div>

          <button
            onClick={() => setShowSegmentsOverlay(!showSegmentsOverlay)}
            className={`px-2 py-1 rounded text-[10px] font-mono border transition-all cursor-pointer ${
              showSegmentsOverlay
                ? 'bg-[#19B8C9]/20 text-[#19B8C9] border-[#19B8C9]/50 shadow-[0_0_8px_rgba(25,184,201,0.2)]'
                : 'bg-[#121826] text-[#7C88A6] border-[#1E2740]'
            }`}
            title="Toggle latest lap mini-segment performance overlay"
          >
            Overlay: {showSegmentsOverlay ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Sector Chips (Top Right) */}
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FF4458]/15 border border-[#FF4458]/40 text-[#FF4458]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4458]" />
            <span>S1 (Red)</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#19B8C9]/15 border border-[#19B8C9]/40 text-[#19B8C9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#19B8C9]" />
            <span>S2 (Cyan)</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#FFC247]/15 border border-[#FFC247]/40 text-[#FFC247]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFC247]" />
            <span>S3 (Amber)</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#3DFF8F]/15 border border-[#3DFF8F]/40 text-[#3DFF8F]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3DFF8F]" />
            <span>DRS</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#F0388F]/15 border border-[#F0388F]/40 text-[#F0388F]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F0388F]" />
            <span>Trap</span>
          </div>
        </div>
      </div>

      {/* Main Track SVG Canvas */}
      <div className="flex-1 w-full h-full relative flex items-center justify-center my-1">
        <svg
          viewBox="0 0 800 560"
          className="w-full h-full max-h-[460px] overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Subtle Grid Pattern */}
          <defs>
            <pattern id="trackGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1E2740" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>
          <rect width="800" height="560" fill="url(#trackGrid)" rx="10" />

          {/* Underlay Track Base (Tarmac Width) */}
          <path
            d={`${sector1Path} ${sector2Path} ${sector3Path} Z`}
            fill="none"
            stroke="#121826"
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={`${sector1Path} ${sector2Path} ${sector3Path} Z`}
            fill="none"
            stroke="#1E2740"
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Sector 1: Red */}
          <path
            d={sector1Path}
            fill="none"
            stroke="#FF4458"
            strokeWidth="5"
            strokeLinecap="round"
            className="opacity-90"
          />

          {/* Sector 2: Cyan */}
          <path
            d={sector2Path}
            fill="none"
            stroke="#19B8C9"
            strokeWidth="5"
            strokeLinecap="round"
            className="opacity-90"
          />

          {/* Sector 3: Amber */}
          <path
            d={sector3Path}
            fill="none"
            stroke="#FFC247"
            strokeWidth="5"
            strokeLinecap="round"
            className="opacity-90"
          />

          {/* DRS Zones (Green highlights) */}
          <path
            d={drs1Path}
            fill="none"
            stroke="#3DFF8F"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray="6 4"
            className="opacity-80"
          />
          <path
            d={drs2Path}
            fill="none"
            stroke="#3DFF8F"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray="6 4"
            className="opacity-80"
          />

          {/* Speed Trap Indicator (Magenta) */}
          <g transform="translate(580, 140)">
            <circle r="7" fill="#F0388F" className="animate-pulse" />
            <circle r="12" fill="none" stroke="#F0388F" strokeWidth="1.5" strokeOpacity="0.6" />
            <text x="14" y="4" fill="#F0388F" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
              SPEED TRAP
            </text>
          </g>

          {/* Start / Finish Line */}
          <g transform="translate(420, 285) rotate(75)">
            <rect x="-14" y="-3" width="28" height="6" fill="#D7DEEC" rx="1" />
            <line x1="-14" y1="0" x2="14" y2="0" stroke="#07090F" strokeWidth="2" strokeDasharray="3 3" />
          </g>

          {/* Mini-segments overlay if enabled and latest lap data available */}
          {showSegmentsOverlay && latestLap?.segments && (
            <g className="segments-overlay">
              {latestLap.segments.map((seg, idx) => {
                const angle = (idx / 25) * Math.PI * 2;
                const r = 180 + 35 * Math.sin(2 * angle) - 25 * Math.cos(3 * angle);
                const sx = 400 + r * Math.cos(angle) * 1.5;
                const sy = 280 + r * Math.sin(angle) * 0.95;

                const segColourMap: Record<string, string> = {
                  purple: '#8B6CFF',
                  green: '#3DFF8F',
                  yellow: '#FFC247',
                  red: '#FF4458'
                };
                const dotColor = segColourMap[seg.colour] || '#19B8C9';

                return (
                  <circle
                    key={seg.id}
                    cx={sx}
                    cy={sy}
                    r={3.5}
                    fill={dotColor}
                    stroke="#07090F"
                    strokeWidth="1"
                  >
                    <title>{`Segment ${idx} (${seg.type}): ${seg.time}s [${seg.colour}]`}</title>
                  </circle>
                );
              })}
            </g>
          )}

          {/* Live Cars As Coloured Dots */}
          {cars.map((car, idx) => {
            const carCol = carColors[idx % carColors.length];
            return (
              <g key={car.id} transform={`translate(${car.x}, ${car.y})`}>
                {/* Glow ring */}
                <circle r="10" fill={carCol} fillOpacity="0.25" />
                {/* Car Core Dot */}
                <circle r="5" fill={carCol} stroke="#07090F" strokeWidth="1.5" />
                {/* Heading Arrow */}
                <line
                  x1="0"
                  y1="0"
                  x2={Math.cos(car.heading) * 12}
                  y2={Math.sin(car.heading) * 12}
                  stroke={carCol}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {/* Car ID badge */}
                <text
                  x="12"
                  y="-4"
                  fill="#D7DEEC"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  fontWeight="bold"
                  className="select-none pointer-events-none drop-shadow-md"
                >
                  {car.id} ({car.speed_kmh || 0} km/h)
                </text>
              </g>
            );
          })}
        </svg>

        {/* Idle / Ready Overlay Banner */}
        {cars.length === 0 && runState === 'idle' && (
          <div className="absolute inset-0 bg-[#07090F]/70 backdrop-blur-[2px] flex items-center justify-center z-20">
            <div className="p-4 rounded-2xl bg-[#0D111A] border-2 border-[#1E2740] shadow-[0_0_30px_rgba(25,184,201,0.2)] text-center space-y-3 max-w-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-[#D7DEEC] flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3DFF8F] animate-pulse" />
                <span>SUPERVISOR READY</span>
              </div>
              <p className="text-[11px] text-[#7C88A6]">
                Baseline learner agent is loaded. Click below to launch the vehicle driving loop and stream live telemetry.
              </p>
              {onStart && (
                <button
                  onClick={onStart}
                  className="w-full py-2.5 rounded-xl bg-[#3DFF8F] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#3DFF8F]/90 cursor-pointer shadow-[0_0_15px_rgba(61,255,143,0.35)] flex items-center justify-center gap-2"
                >
                  <span>Launch Driver Telemetry</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Cars Legend */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1E2740] select-none text-[11px] font-mono">
        <div className="flex items-center gap-3">
          <span className="text-[#7C88A6] font-bold">GRID CARS:</span>
          {cars.length > 0 ? (
            cars.map((car, idx) => (
              <div key={car.id} className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#121826] border border-[#1E2740]">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: carColors[idx % carColors.length] }}
                />
                <span className="font-bold text-[#D7DEEC]">{car.name || car.id}</span>
                <span className="text-[#7C88A6]">[{idx + 1}]</span>
                <span className="text-[#19B8C9]">{car.speed_kmh ? `${car.speed_kmh} km/h` : ''}</span>
              </div>
            ))
          ) : (
            <span className="text-[#7C88A6] italic">No active simulated cars on track</span>
          )}
        </div>

        {/* Mini-segment legend info */}
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-[#7C88A6]">Segments:</span>
          <span className="text-[#8B6CFF] font-bold">● Purple (Fastest)</span>
          <span className="text-[#3DFF8F] font-bold">● Green (PB)</span>
          <span className="text-[#FFC247] font-bold">● Yellow (Slower)</span>
          <span className="text-[#FF4458] font-bold">● Red (&gt;0.2s)</span>
        </div>
      </div>
    </div>
  );
};
