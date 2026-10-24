import React, { useState, useMemo } from 'react';
import { CarTelemetry, LapCompleteEvent, TrackData } from '../../types/index.ts';

interface SVGTrackMapProps {
  cars: CarTelemetry[];
  latestLap: LapCompleteEvent | null;
  track?: TrackData;
  runState?: string;
  onStart?: () => void;
}

interface Point2D {
  x: number;
  y: number;
}

export const SVGTrackMap: React.FC<SVGTrackMapProps> = ({
  cars,
  latestLap,
  track,
  runState = 'idle',
  onStart
}) => {
  const [showSegmentsOverlay, setShowSegmentsOverlay] = useState<boolean>(true);

  // Fallback Silverstone GP Points (800 x 560 coordinate space)
  const silverstoneDefaultPoints: Point2D[] = [
    { x: 420, y: 285 }, { x: 500, y: 280 }, { x: 610, y: 200 }, { x: 650, y: 140 },
    { x: 580, y: 65 },  { x: 440, y: 85 },  { x: 330, y: 145 }, { x: 200, y: 170 },
    { x: 95, y: 240 },  { x: 90, y: 340 },  { x: 140, y: 430 }, { x: 290, y: 470 },
    { x: 440, y: 460 }, { x: 560, y: 380 }, { x: 620, y: 290 }, { x: 560, y: 195 },
    { x: 430, y: 235 }
  ];

  // Fallback Spa-Francorchamps Points
  const spaDefaultPoints: Point2D[] = [
    { x: 380, y: 310 }, { x: 440, y: 300 }, { x: 500, y: 340 }, { x: 540, y: 310 },
    { x: 580, y: 230 }, { x: 660, y: 130 }, { x: 640, y: 70 },  { x: 590, y: 65 },
    { x: 540, y: 80 },  { x: 480, y: 120 }, { x: 440, y: 170 }, { x: 370, y: 210 },
    { x: 320, y: 260 }, { x: 240, y: 280 }, { x: 170, y: 310 }, { x: 120, y: 380 },
    { x: 180, y: 440 }, { x: 270, y: 430 }, { x: 330, y: 360 }, { x: 360, y: 320 }
  ];

  // Extract raw points from track or fallback based on track.id
  const rawPoints = useMemo<Point2D[]>(() => {
    if (track?.centreline_points && Array.isArray(track.centreline_points) && track.centreline_points.length >= 3) {
      return track.centreline_points.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
    }
    if (track?.spline_nodes && Array.isArray(track.spline_nodes) && track.spline_nodes.length >= 3) {
      return track.spline_nodes.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
    }
    if (track?.id === 'spa_francorchamps' || track?.name?.toLowerCase().includes('spa')) {
      return spaDefaultPoints;
    }
    return silverstoneDefaultPoints;
  }, [track]);

  // Scale and center points smoothly inside the 800 x 560 SVG canvas while preserving aspect ratio
  const normalizedPoints = useMemo<Point2D[]>(() => {
    if (rawPoints.length < 3) return silverstoneDefaultPoints;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    rawPoints.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;

    // If points are already within bounds [40..760, 40..520], keep them
    if (minX >= 50 && maxX <= 750 && minY >= 50 && maxY <= 510) {
      return rawPoints;
    }

    const padX = 70;
    const padY = 50;
    const targetW = 800 - padX * 2;
    const targetH = 560 - padY * 2;
    const scale = Math.min(targetW / spanX, targetH / spanY);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    return rawPoints.map((p) => ({
      x: 400 + (p.x - centerX) * scale,
      y: 280 + (p.y - centerY) * scale
    }));
  }, [rawPoints]);

  // Build smooth cubic Bezier spline segments for the track loop
  const splineSegments = useMemo(() => {
    const pts = normalizedPoints;
    const n = pts.length;
    if (n < 3) return [];

    const segments: {
      p0: Point2D;
      p1: Point2D;
      c1: Point2D;
      c2: Point2D;
      length: number;
    }[] = [];

    for (let i = 0; i < n; i++) {
      const pPrev = pts[(i - 1 + n) % n];
      const pCurrent = pts[i];
      const pNext = pts[(i + 1) % n];
      const pNextNext = pts[(i + 2) % n];

      // Catmull-Rom to Cubic Bezier conversion
      const c1 = {
        x: pCurrent.x + (pNext.x - pPrev.x) / 6,
        y: pCurrent.y + (pNext.y - pPrev.y) / 6
      };
      const c2 = {
        x: pNext.x - (pNextNext.x - pCurrent.x) / 6,
        y: pNext.y - (pNextNext.y - pCurrent.y) / 6
      };

      // Approximate segment length
      const dx = pNext.x - pCurrent.x;
      const dy = pNext.y - pCurrent.y;
      const chord = Math.hypot(dx, dy);

      segments.push({
        p0: pCurrent,
        p1: pNext,
        c1,
        c2,
        length: chord
      });
    }

    return segments;
  }, [normalizedPoints]);

  // Total circuit chord length and sector partitions
  const { totalLength, sector1Path, sector2Path, sector3Path, fullLoopPath, drs1Path, drs2Path, sfPoint, sfHeading } = useMemo(() => {
    if (splineSegments.length === 0) {
      return {
        totalLength: 1,
        sector1Path: '',
        sector2Path: '',
        sector3Path: '',
        fullLoopPath: '',
        drs1Path: '',
        drs2Path: '',
        sfPoint: { x: 420, y: 285 },
        sfHeading: 0
      };
    }

    let sum = 0;
    splineSegments.forEach((s) => (sum += s.length));

    const s1EndDist = sum * 0.333;
    const s2EndDist = sum * 0.666;

    let s1Cmds: string[] = [];
    let s2Cmds: string[] = [];
    let s3Cmds: string[] = [];
    let loopCmds: string[] = [`M ${splineSegments[0].p0.x.toFixed(1)} ${splineSegments[0].p0.y.toFixed(1)}`];

    let currentDist = 0;

    splineSegments.forEach((seg, i) => {
      const segStartDist = currentDist;
      currentDist += seg.length;

      const curveCmd = `C ${seg.c1.x.toFixed(1)} ${seg.c1.y.toFixed(1)}, ${seg.c2.x.toFixed(1)} ${seg.c2.y.toFixed(1)}, ${seg.p1.x.toFixed(1)} ${seg.p1.y.toFixed(1)}`;
      loopCmds.push(curveCmd);

      if (segStartDist < s1EndDist) {
        if (s1Cmds.length === 0) {
          s1Cmds.push(`M ${seg.p0.x.toFixed(1)} ${seg.p0.y.toFixed(1)}`);
        }
        s1Cmds.push(curveCmd);
      } else if (segStartDist < s2EndDist) {
        if (s2Cmds.length === 0) {
          s2Cmds.push(`M ${seg.p0.x.toFixed(1)} ${seg.p0.y.toFixed(1)}`);
        }
        s2Cmds.push(curveCmd);
      } else {
        if (s3Cmds.length === 0) {
          s3Cmds.push(`M ${seg.p0.x.toFixed(1)} ${seg.p0.y.toFixed(1)}`);
        }
        s3Cmds.push(curveCmd);
      }
    });

    // Start-finish line orientation
    const p0 = splineSegments[0].p0;
    const p1 = splineSegments[0].p1;
    const sfHeading = Math.atan2(p1.y - p0.y, p1.x - p0.x);

    // DRS zones (e.g. segments around S1 straight and S3 straight)
    const n = splineSegments.length;
    const d1Start = Math.floor(n * 0.15);
    const d1End = Math.floor(n * 0.28);
    const d2Start = Math.floor(n * 0.65);
    const d2End = Math.floor(n * 0.78);

    const buildSubpath = (startIdx: number, endIdx: number) => {
      if (startIdx >= n) return '';
      const startP = splineSegments[startIdx].p0;
      let path = `M ${startP.x.toFixed(1)} ${startP.y.toFixed(1)}`;
      for (let k = startIdx; k <= endIdx && k < n; k++) {
        const seg = splineSegments[k];
        path += ` C ${seg.c1.x.toFixed(1)} ${seg.c1.y.toFixed(1)}, ${seg.c2.x.toFixed(1)} ${seg.c2.y.toFixed(1)}, ${seg.p1.x.toFixed(1)} ${seg.p1.y.toFixed(1)}`;
      }
      return path;
    };

    return {
      totalLength: sum,
      sector1Path: s1Cmds.join(' '),
      sector2Path: s2Cmds.join(' '),
      sector3Path: s3Cmds.join(' '),
      fullLoopPath: `${loopCmds.join(' ')} Z`,
      drs1Path: buildSubpath(d1Start, d1End),
      drs2Path: buildSubpath(d2Start, d2End),
      sfPoint: p0,
      sfHeading
    };
  }, [splineSegments]);

  // Continuous spline evaluation for arbitrary progress p in [0, 1)
  const sampleSplineAtProgress = (progress: number) => {
    const p = ((progress % 1) + 1) % 1;
    const n = splineSegments.length;
    if (n === 0) return { x: 400, y: 280, heading: 0 };

    const targetDist = p * totalLength;
    let accumulated = 0;

    for (let i = 0; i < n; i++) {
      const seg = splineSegments[i];
      if (accumulated + seg.length >= targetDist || i === n - 1) {
        const segProgress = seg.length > 0 ? (targetDist - accumulated) / seg.length : 0;
        const t = Math.max(0, Math.min(1, segProgress));
        const u = 1 - t;

        // Cubic Bezier formula: B(t) = (1-t)^3*P0 + 3(1-t)^2*t*C1 + 3(1-t)*t^2*C2 + t^3*P1
        const x =
          u * u * u * seg.p0.x +
          3 * u * u * t * seg.c1.x +
          3 * u * t * t * seg.c2.x +
          t * t * t * seg.p1.x;
        const y =
          u * u * u * seg.p0.y +
          3 * u * u * t * seg.c1.y +
          3 * u * t * t * seg.c2.y +
          t * t * t * seg.p1.y;

        // Derivative for tangent heading: B'(t)
        const dx =
          3 * u * u * (seg.c1.x - seg.p0.x) +
          6 * u * t * (seg.c2.x - seg.c1.x) +
          3 * t * t * (seg.p1.x - seg.c2.x);
        const dy =
          3 * u * u * (seg.c1.y - seg.p0.y) +
          6 * u * t * (seg.c2.y - seg.c1.y) +
          3 * t * t * (seg.p1.y - seg.c2.y);

        const heading = Math.atan2(dy, dx);
        return { x, y, heading };
      }
      accumulated += seg.length;
    }

    return { x: splineSegments[0].p0.x, y: splineSegments[0].p0.y, heading: 0 };
  };

  // Car dot palette
  const carColors = ['#19B8C9', '#F0388F', '#3DFF8F', '#FFC247', '#8B6CFF'];

  return (
    <div className="relative w-full h-full bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] p-3 flex flex-col justify-between overflow-hidden shadow-[0_0_12px_rgba(25,184,201,0.08)]">
      {/* Top Header: Track Name, Length, S1/S2/S3 chips, and mini-segments overlay toggle */}
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
          {fullLoopPath && (
            <>
              <path
                d={fullLoopPath}
                fill="none"
                stroke="#121826"
                strokeWidth="24"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={fullLoopPath}
                fill="none"
                stroke="#1E2740"
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Sector 1: Red */}
          {sector1Path && (
            <path
              d={sector1Path}
              fill="none"
              stroke="#FF4458"
              strokeWidth="5"
              strokeLinecap="round"
              className="opacity-90"
            />
          )}

          {/* Sector 2: Cyan */}
          {sector2Path && (
            <path
              d={sector2Path}
              fill="none"
              stroke="#19B8C9"
              strokeWidth="5"
              strokeLinecap="round"
              className="opacity-90"
            />
          )}

          {/* Sector 3: Amber */}
          {sector3Path && (
            <path
              d={sector3Path}
              fill="none"
              stroke="#FFC247"
              strokeWidth="5"
              strokeLinecap="round"
              className="opacity-90"
            />
          )}

          {/* DRS Zones (Green highlights) */}
          {drs1Path && (
            <path
              d={drs1Path}
              fill="none"
              stroke="#3DFF8F"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray="6 4"
              className="opacity-80"
            />
          )}
          {drs2Path && (
            <path
              d={drs2Path}
              fill="none"
              stroke="#3DFF8F"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray="6 4"
              className="opacity-80"
            />
          )}

          {/* Speed Trap Indicator (Magenta) */}
          {splineSegments.length > 5 && (
            <g
              transform={`translate(${splineSegments[Math.floor(splineSegments.length * 0.35)].p0.x.toFixed(1)}, ${splineSegments[Math.floor(splineSegments.length * 0.35)].p0.y.toFixed(1)})`}
            >
              <circle r="7" fill="#F0388F" className="animate-pulse" />
              <circle r="12" fill="none" stroke="#F0388F" strokeWidth="1.5" strokeOpacity="0.6" />
              <text x="14" y="4" fill="#F0388F" fontSize="10" fontFamily="JetBrains Mono" fontWeight="bold">
                SPEED TRAP
              </text>
            </g>
          )}

          {/* Start / Finish Line */}
          <g transform={`translate(${sfPoint.x.toFixed(1)}, ${sfPoint.y.toFixed(1)}) rotate(${((sfHeading * 180) / Math.PI + 90).toFixed(1)})`}>
            <rect x="-14" y="-3" width="28" height="6" fill="#D7DEEC" rx="1" />
            <line x1="-14" y1="0" x2="14" y2="0" stroke="#07090F" strokeWidth="2" strokeDasharray="3 3" />
          </g>

          {/* Mini-segments overlay if enabled and latest lap data available */}
          {showSegmentsOverlay && latestLap?.segments && (
            <g className="segments-overlay">
              {latestLap.segments.map((seg, idx) => {
                const segPos = sampleSplineAtProgress(idx / 25.0);
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
                    cx={segPos.x}
                    cy={segPos.y}
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

          {/* Live Cars As Coloured Dots (Smooth Spline Projection to eliminate TORCS coordinate teleportation) */}
          {cars.map((car, idx) => {
            const carCol = carColors[idx % carColors.length];
            // Continuous spline projection prevents any teleportation across frames
            const progress = typeof car.progress === 'number' ? car.progress : (idx * 0.25);
            const sampled = sampleSplineAtProgress(progress);

            const posX = sampled.x;
            const posY = sampled.y;
            const head = sampled.heading;

            return (
              <g
                key={car.id}
                transform={`translate(${posX.toFixed(1)}, ${posY.toFixed(1)})`}
                className="transition-transform duration-75 ease-linear pointer-events-none"
              >
                {/* Outer Glow Halo */}
                <circle
                  r="11"
                  fill={carCol}
                  fillOpacity="0.25"
                  className="animate-pulse"
                />
                {/* Solid Core Dot */}
                <circle
                  r="6"
                  fill={carCol}
                  stroke="#07090F"
                  strokeWidth="2"
                />
                {/* Heading Arrow */}
                <line
                  x1="0"
                  y1="0"
                  x2={Math.cos(head) * 12}
                  y2={Math.sin(head) * 12}
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
