import React from 'react';

interface F1CarCrossSectionProps {
  activeTab: string;
  carSetupValues: Record<string, number>;
}

/**
 * 2025 Formula 1 Ground-Effect Chassis Cross-Section CAD Blueprint
 * Mimics F1 25 car setup menu: clean technical wireframe/cross-section
 * highlighting the active vehicle dynamics subsystem without cluttered overlay labels.
 */
export const F1CarCrossSectionSVG: React.FC<F1CarCrossSectionProps> = ({ activeTab, carSetupValues }) => {
  const frontWing = carSetupValues['wings.front_wing'] ?? 7;
  const rearWing = carSetupValues['wings.rear_wing'] ?? 8;
  const frontHeight = carSetupValues['ride_height.front'] ?? 3;
  const rearHeight = carSetupValues['ride_height.rear'] ?? 6;

  const isWings = activeTab === 'wings';
  const isSuspension = activeTab === 'suspension' || activeTab === 'arb';
  const isRideHeight = activeTab === 'ride_height';
  const isDiff = activeTab === 'differential';
  const isBrake = activeTab === 'brake';
  const isTyres = activeTab === 'tyres' || activeTab === 'toe_camber';

  // Dynamic component zoom viewBox: zooms in on the specific part being tuned
  let dynamicViewBox = "0 0 760 300";
  if (activeTab === 'wings') {
    // Zoom in close on Front Wing, nosecone, and cascade flaps
    dynamicViewBox = "20 120 340 160";
  } else if (isSuspension) {
    // Zoom in on front suspension pushrods, wishbones, and dampers
    dynamicViewBox = "130 135 300 145";
  } else if (isRideHeight) {
    // Zoom in on underfloor Venturi channel and ground clearance
    dynamicViewBox = "80 150 600 135";
  } else if (isDiff) {
    // Zoom in on rear gearbox casing and differential
    dynamicViewBox = "530 140 230 140";
  } else if (isBrake) {
    // Zoom in on brake assembly and caliper
    dynamicViewBox = "120 155 240 130";
  } else if (activeTab === 'fuel') {
    // Zoom in on central monocoque fuel cell
    dynamicViewBox = "280 100 240 140";
  } else if (isTyres) {
    // Zoom in on wheels
    dynamicViewBox = "110 130 560 155";
  }

  return (
    <svg viewBox={dynamicViewBox} className="w-full h-full select-none transition-all duration-300 ease-out" preserveAspectRatio="xMidYMid meet">
      <defs>
        {/* Technical Floor Grid */}
        <pattern id="f1CarGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1E2740" strokeWidth="0.5" strokeOpacity="0.35" />
        </pattern>
        {/* Glow Filters */}
        <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="greenGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="amberGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background Grid */}
      <rect width="760" height="300" fill="url(#f1CarGrid)" />

      {/* Ground Datum Line & Underfloor Suction Shadow */}
      <line x1="40" y1="262" x2="720" y2="262" stroke="#1E2740" strokeWidth="1" strokeDasharray="4 4" />
      <path
        d="M 120 260 L 640 260 L 610 268 L 150 268 Z"
        fill="#121826"
        fillOpacity="0.5"
      />

      {/* --- CAR MONOCOQUE & CHASSIS CROSS-SECTION --- */}
      {/* 2025 Bodywork Silhouette with Venturi Undercut */}
      <path
        d="M 70 215 
           C 110 210, 160 200, 210 185 
           C 250 172, 280 150, 310 148 
           L 360 148 
           C 380 120, 410 112, 440 112 
           C 470 112, 490 125, 520 145 
           C 560 155, 600 162, 630 175 
           L 660 175 
           L 655 240 
           C 610 242, 570 248, 520 252 
           C 440 255, 300 255, 230 252 
           C 180 250, 130 245, 90 238 
           Z"
        fill="#0D111A"
        stroke={isRideHeight ? '#3DFF8F' : '#2B354C'}
        strokeWidth={isRideHeight ? '2' : '1.5'}
        strokeDasharray={isRideHeight ? 'none' : 'none'}
      />

      {/* Internal Monocoque Cockpit & Fuel Cell Cutout */}
      <path
        d="M 315 152 
           C 335 152, 350 165, 360 185 
           L 380 185 
           C 390 160, 420 155, 450 155 
           L 470 190 
           L 380 220 
           L 300 210 
           Z"
        fill="#121826"
        stroke="#1E2740"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* Halo Safety Structure */}
      <path
        d="M 345 150 C 355 130, 375 125, 400 125 C 425 125, 435 135, 440 150"
        fill="none"
        stroke="#3A4866"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <line x1="392" y1="125" x2="390" y2="155" stroke="#3A4866" strokeWidth="3" />

      {/* Roll Hoop & Airbox Intake Scoop */}
      <path
        d="M 430 115 C 438 95, 455 92, 475 92 C 485 92, 495 105, 500 120 Z"
        fill="#121826"
        stroke="#19B8C9"
        strokeWidth="1.5"
      />

      {/* --- UNDERFLOOR VENTURI TUNNELS (Ground Effect Floor) --- */}
      <g>
        {/* Venturi Floor Leading Edge to Diffuser Kickup */}
        <path
          d={`M 220 ${256 - frontHeight * 0.8} 
             C 320 ${254 - frontHeight * 0.5}, 460 ${252 - rearHeight * 0.4}, 540 ${248 - rearHeight * 0.8} 
             C 580 ${242 - rearHeight}, 620 ${225 - rearHeight * 1.5}, 650 205`}
          fill="none"
          stroke={isRideHeight ? '#3DFF8F' : '#19B8C9'}
          strokeWidth={isRideHeight ? '3' : '2'}
          strokeLinecap="round"
          filter={isRideHeight ? 'url(#greenGlow)' : undefined}
        />
        {/* Venturi Flow Lines (X-Ray Floor Streamlines) */}
        <path
          d="M 230 252 C 340 250, 480 248, 560 238 C 600 232, 630 218, 646 208"
          fill="none"
          stroke="#3DFF8F"
          strokeWidth="1"
          strokeDasharray="4 4"
          strokeOpacity={isRideHeight ? '0.9' : '0.4'}
        />
        <path
          d="M 245 255 C 360 254, 490 252, 570 244 C 610 238, 635 226, 648 214"
          fill="none"
          stroke="#19B8C9"
          strokeWidth="0.8"
          strokeDasharray="2 4"
          strokeOpacity="0.4"
        />
      </g>

      {/* --- FRONT WING ASSEMBLY (Multi-Element with Flap Angle Highlighting) --- */}
      <g filter={isWings ? 'url(#cyanGlow)' : undefined}>
        {/* Main Plane */}
        <path
          d="M 45 238 C 80 236, 120 232, 160 228 L 160 234 C 120 238, 80 242, 45 244 Z"
          fill={isWings ? '#19B8C9' : '#1E2740'}
          stroke={isWings ? '#19B8C9' : '#3A4866'}
          strokeWidth="1.5"
        />
        {/* Adjustable Flap (Rotates with frontWing setting) */}
        <path
          d={`M 60 232 C 90 ${230 - frontWing * 0.8}, 130 ${226 - frontWing * 1.2}, 155 ${222 - frontWing * 1.4} L 155 ${226 - frontWing * 1.2} C 130 229, 90 233, 60 235 Z`}
          fill={isWings ? '#3DFF8F' : '#2B354C'}
          stroke={isWings ? '#3DFF8F' : '#4E5D78'}
          strokeWidth="1.5"
        />
        {/* Endplate & Diveplane */}
        <path
          d="M 45 215 L 45 246 C 45 250, 60 250, 75 248 L 75 222 Z"
          fill="#121826"
          stroke={isWings ? '#19B8C9' : '#3A4866'}
          strokeWidth="1.5"
        />
        <path d="M 45 230 C 55 228, 65 227, 72 225" fill="none" stroke="#19B8C9" strokeWidth="1.5" />
      </g>

      {/* --- REAR WING & BEAM WING ASSEMBLY --- */}
      <g filter={isWings ? 'url(#cyanGlow)' : undefined}>
        {/* Swan-Neck Mount Pillar */}
        <path d="M 610 185 C 615 150, 625 125, 638 108 L 642 108 C 630 128, 622 155, 616 185 Z" fill="#2B354C" />
        {/* Main Plane */}
        <path
          d="M 625 118 C 645 116, 675 114, 695 110 L 695 116 C 675 120, 645 122, 625 124 Z"
          fill={isWings ? '#19B8C9' : '#1E2740'}
          stroke={isWings ? '#19B8C9' : '#3A4866'}
          strokeWidth="1.5"
        />
        {/* DRS Flap (Upper element) */}
        <path
          d={`M 630 ${108 - rearWing * 0.6} C 650 ${105 - rearWing * 0.9}, 678 ${102 - rearWing * 1.2}, 696 ${98 - rearWing * 1.5} L 696 ${103 - rearWing * 1.2} C 678 106, 650 110, 630 112 Z`}
          fill={isWings ? '#3DFF8F' : '#2B354C'}
          stroke={isWings ? '#3DFF8F' : '#4E5D78'}
          strokeWidth="1.5"
        />
        {/* Beam Wing */}
        <path
          d="M 620 188 C 640 186, 665 184, 680 180 L 680 184 C 665 188, 640 190, 620 192 Z"
          fill={isWings ? '#19B8C9' : '#1E2740'}
          stroke="#19B8C9"
          strokeWidth="1.2"
        />
        {/* Endplate */}
        <path
          d="M 622 95 L 698 90 C 702 90, 702 145, 698 165 C 695 178, 670 195, 648 198 L 626 145 Z"
          fill="#0D111A"
          fillOpacity="0.4"
          stroke={isWings ? '#19B8C9' : '#3A4866'}
          strokeWidth="1.5"
        />
      </g>

      {/* --- TRANSMISSION & DIFFERENTIAL CASING (Rear) --- */}
      <g filter={isDiff ? 'url(#amberGlow)' : undefined}>
        <rect
          x="575"
          y="200"
          width="42"
          height="32"
          rx="5"
          fill="#121826"
          stroke={isDiff ? '#FFC247' : '#2B354C'}
          strokeWidth={isDiff ? '2' : '1'}
        />
        <circle
          cx="596"
          cy="216"
          r="10"
          fill="none"
          stroke={isDiff ? '#FFC247' : '#3A4866'}
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      </g>

      {/* --- SUSPENSION PUSHRODS & WISHBONES --- */}
      <g filter={isSuspension ? 'url(#cyanGlow)' : undefined}>
        {/* Front Pushrod & Double Wishbone */}
        <line
          x1="182"
          y1="222"
          x2="260"
          y2="175"
          stroke={isSuspension ? '#19B8C9' : '#4E5D78'}
          strokeWidth={isSuspension ? '2.5' : '1.5'}
        />
        <line
          x1="182"
          y1="235"
          x2="255"
          y2="210"
          stroke={isSuspension ? '#19B8C9' : '#3A4866'}
          strokeWidth="1.5"
        />
        <line
          x1="182"
          y1="210"
          x2="252"
          y2="190"
          stroke={isSuspension ? '#19B8C9' : '#3A4866'}
          strokeWidth="1.5"
        />
        {/* Front Inboard Damper Rocker Pivot */}
        <circle cx="260" cy="175" r="3.5" fill={isSuspension ? '#3DFF8F' : '#4E5D78'} />

        {/* Rear Pullrod/Pushrod & Wishbone */}
        <line
          x1="570"
          y1="222"
          x2="515"
          y2="175"
          stroke={isSuspension ? '#19B8C9' : '#4E5D78'}
          strokeWidth={isSuspension ? '2.5' : '1.5'}
        />
        <line
          x1="570"
          y1="235"
          x2="525"
          y2="215"
          stroke={isSuspension ? '#19B8C9' : '#3A4866'}
          strokeWidth="1.5"
        />
        <line
          x1="570"
          y1="210"
          x2="522"
          y2="192"
          stroke={isSuspension ? '#19B8C9' : '#3A4866'}
          strokeWidth="1.5"
        />
        {/* Rear Inboard Rocker Pivot */}
        <circle cx="515" cy="175" r="3.5" fill={isSuspension ? '#3DFF8F' : '#4E5D78'} />
      </g>

      {/* --- WHEELS, TYRES & BRAKE ASSEMBLIES (18-Inch Pirelli Spec) --- */}
      {/* Front Wheel (FL/FR) */}
      <g filter={isTyres ? 'url(#cyanGlow)' : undefined}>
        {/* Tyre Slick Tread Cross-Section */}
        <rect
          x="152"
          y="180"
          width="60"
          height="82"
          rx="12"
          fill="#0D111A"
          stroke={isTyres ? '#19B8C9' : '#2B354C'}
          strokeWidth={isTyres ? '2.5' : '1.5'}
        />
        {/* Rim & Aero Cover Fins */}
        <circle cx="182" cy="221" r="28" fill="#121826" stroke="#3A4866" strokeWidth="1.5" />
        <circle cx="182" cy="221" r="24" fill="none" stroke="#1E2740" strokeWidth="1" strokeDasharray="6 4" />
        <circle cx="182" cy="221" r="12" fill="#07090F" stroke="#19B8C9" strokeWidth="1" />
        {/* Brake Disc & Caliper (Carbon-Carbon) */}
        <g filter={isBrake ? 'url(#amberGlow)' : undefined}>
          <circle
            cx="182"
            cy="221"
            r="19"
            fill="none"
            stroke={isBrake ? '#FF4458' : '#2B354C'}
            strokeWidth={isBrake ? '2.5' : '1.5'}
          />
          <path
            d="M 172 206 C 176 204, 188 204, 192 206 L 194 213 L 170 213 Z"
            fill={isBrake ? '#FF4458' : '#4E5D78'}
          />
        </g>
      </g>

      {/* Rear Wheel (RL/RR - Wider 18-Inch Spec) */}
      <g filter={isTyres ? 'url(#cyanGlow)' : undefined}>
        {/* Tyre Slick Tread Cross-Section */}
        <rect
          x="538"
          y="176"
          width="68"
          height="86"
          rx="14"
          fill="#0D111A"
          stroke={isTyres ? '#19B8C9' : '#2B354C'}
          strokeWidth={isTyres ? '2.5' : '1.5'}
        />
        {/* Rim & Aero Cover Fins */}
        <circle cx="572" cy="219" r="30" fill="#121826" stroke="#3A4866" strokeWidth="1.5" />
        <circle cx="572" cy="219" r="26" fill="none" stroke="#1E2740" strokeWidth="1" strokeDasharray="6 4" />
        <circle cx="572" cy="219" r="13" fill="#07090F" stroke="#19B8C9" strokeWidth="1" />
        {/* Rear Brake Disc & Caliper */}
        <g filter={isBrake ? 'url(#amberGlow)' : undefined}>
          <circle
            cx="572"
            cy="219"
            r="20"
            fill="none"
            stroke={isBrake ? '#FF4458' : '#2B354C'}
            strokeWidth={isBrake ? '2.5' : '1.5'}
          />
          <path
            d="M 562 204 C 566 202, 578 202, 582 204 L 584 211 L 560 211 Z"
            fill={isBrake ? '#FF4458' : '#4E5D78'}
          />
        </g>
      </g>

      {/* Centerline Cross-Section Axis Datum Marks */}
      <line x1="60" y1="221" x2="680" y2="221" stroke="#19B8C9" strokeWidth="0.5" strokeDasharray="12 4" strokeOpacity="0.3" />
      <circle cx="182" cy="221" r="2" fill="#19B8C9" />
      <circle cx="572" cy="219" r="2" fill="#19B8C9" />
    </svg>
  );
};

interface F1TyreCornerZoomProps {
  selectedCorner?: 'FL' | 'FR' | 'RL' | 'RR';
  corner?: 'FL' | 'FR' | 'RL' | 'RR';
  activeTab?: string;
  carSetupValues: Record<string, number>;
}

/**
 * Authentic F1 25 Setup Menu Corner Camera Zoom:
 * Direct zoomed-in perspective on the selected corner tyre with camber & toe tilt,
 * while showing a recognizable section of the adjacent car bodywork:
 * - Front (FL/FR): Nosecone, front wing multi-elements, and endplate diveplane.
 * - Rear (RL/RR): Venturi floor edge wing, sidepod coke-bottle undercut, and rear wing endplate.
 * Clean technical schematic without obstructing text labels.
 */
export const F1TyreCornerZoomSVG: React.FC<F1TyreCornerZoomProps> = ({ selectedCorner, corner, carSetupValues }) => {
  const effectiveCorner = corner || selectedCorner || 'FL';
  const isFront = effectiveCorner === 'FL' || effectiveCorner === 'FR';
  const isRear = !isFront;
  const isLeft = effectiveCorner === 'FL' || effectiveCorner === 'RL';

  // Read actual live camber & toe parameters
  const camberVal = isFront
    ? carSetupValues['toe_camber.front_camber_deg'] ?? -2.8
    : carSetupValues['toe_camber.rear_camber_deg'] ?? -1.4;

  const toeVal = isFront
    ? carSetupValues['toe_camber.front_toe_deg'] ?? 0.08
    : carSetupValues['toe_camber.rear_toe_deg'] ?? 0.24;

  // Visual tilt exaggeration for instant intuitive feedback
  // Negative camber = top of tyre tilted inward toward car centerline
  const camberDeg = camberVal * 1.8;

  return (
    <svg viewBox="0 0 540 380" className="w-full h-full select-none" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="zoomGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1E2740" strokeWidth="0.5" strokeOpacity="0.4" />
        </pattern>
        <filter id="tyreCyanGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="accentGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Dark Floor Grid */}
      <rect width="540" height="380" fill="url(#zoomGrid)" />

      {/* Ground Contact Patch Line & Datum */}
      <line x1="40" y1="330" x2="500" y2="330" stroke="#1E2740" strokeWidth="1.5" strokeDasharray="6 4" />
      <line x1="200" y1="330" x2="340" y2="330" stroke="#3DFF8F" strokeWidth="2.5" strokeLinecap="round" />

      {/* Flip coordinate frame if viewing right side corner (FR / RR) */}
      <g transform={isLeft ? 'translate(0, 0)' : 'translate(540, 0) scale(-1, 1)'}>
        {/* ============================================================== */}
        {/* ADJACENT CAR SECTION (Cross-Section Perspective) */}
        {/* ============================================================== */}
        {isFront ? (
          // FRONT CORNER CONTEXT: Nosecone, front wing flaps, and endplate
          <g className="car-front-context">
            {/* Tapered Carbon Fiber Nosecone Section */}
            <path
              d="M 60 40 
                 C 100 60, 140 110, 160 170 
                 L 160 280 
                 L 110 280 
                 C 90 220, 60 160, 40 110 
                 Z"
              fill="#0D111A"
              stroke="#2B354C"
              strokeWidth="2"
            />
            {/* Nosecone Livery Accent Stripe */}
            <path
              d="M 62 48 C 98 68, 136 114, 154 172"
              fill="none"
              stroke="#19B8C9"
              strokeWidth="2"
              strokeOpacity="0.7"
            />

            {/* Front Wing Assembly Adjacent to Wheel */}
            {/* Multi-element Aerodynamic Wing Flaps */}
            <path
              d="M 20 270 C 60 268, 120 262, 175 258 L 175 272 C 120 276, 60 280, 20 282 Z"
              fill="#121826"
              stroke="#19B8C9"
              strokeWidth="1.5"
            />
            <path
              d="M 25 256 C 65 252, 115 248, 168 244 L 168 254 C 115 258, 65 262, 25 264 Z"
              fill="#1A2234"
              stroke="#3A4866"
              strokeWidth="1.2"
            />
            <path
              d="M 30 242 C 70 238, 115 234, 160 230 L 160 238 C 115 242, 70 246, 30 248 Z"
              fill="#121826"
              stroke="#3DFF8F"
              strokeWidth="1.2"
            />

            {/* Front Wing Endplate with Diveplane */}
            <path
              d="M 18 200 L 18 290 C 18 295, 35 295, 45 292 L 45 220 Z"
              fill="#0D111A"
              stroke="#3A4866"
              strokeWidth="2"
            />
            {/* Endplate Aerodynamic Diveplane */}
            <path d="M 18 235 C 28 230, 40 228, 48 226" fill="none" stroke="#19B8C9" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 18 215 C 26 212, 38 210, 44 209" fill="none" stroke="#3DFF8F" strokeWidth="1.8" strokeLinecap="round" />

            {/* Suspension Pushrod Linkage entering monocoque chassis */}
            <line x1="160" y1="180" x2="235" y2="245" stroke="#19B8C9" strokeWidth="3" strokeLinecap="round" />
            <line x1="160" y1="210" x2="235" y2="260" stroke="#4E5D78" strokeWidth="2" strokeLinecap="round" />
            <line x1="160" y1="250" x2="235" y2="280" stroke="#4E5D78" strokeWidth="2" strokeLinecap="round" />
            {/* Steering Track Rod */}
            <line x1="160" y1="230" x2="232" y2="252" stroke="#FFC247" strokeWidth="2" strokeDasharray="3 3" />
          </g>
        ) : (
          // REAR CORNER CONTEXT: Venturi floor edge wing, sidepod undercut, and rear wing endplate
          <g className="car-rear-context">
            {/* Floor Edge Wing (Venturi Ground-Effect Seal) */}
            <path
              d="M 50 300 
                 C 100 298, 150 292, 195 282 
                 L 195 294 
                 C 150 302, 100 306, 50 308 Z"
              fill="#121826"
              stroke="#3DFF8F"
              strokeWidth="2"
            />
            {/* Floor Edge Vanes / Strakes */}
            <line x1="90" y1="300" x2="95" y2="285" stroke="#3DFF8F" strokeWidth="2" strokeLinecap="round" />
            <line x1="125" y1="297" x2="130" y2="282" stroke="#3DFF8F" strokeWidth="2" strokeLinecap="round" />
            <line x1="160" y1="294" x2="165" y2="279" stroke="#3DFF8F" strokeWidth="2" strokeLinecap="round" />

            {/* Sidepod Coke-Bottle Undercut & Engine Cowl Section */}
            <path
              d="M 60 70 
                 C 100 90, 135 140, 155 200 
                 C 165 235, 175 260, 185 285 
                 L 120 285 
                 C 105 240, 85 180, 50 120 Z"
              fill="#0D111A"
              stroke="#2B354C"
              strokeWidth="2"
            />

            {/* Rear Wing Endplate Section in Background */}
            <path
              d="M 40 50 L 130 40 C 135 40, 135 120, 130 150 L 50 160 Z"
              fill="#0D111A"
              fillOpacity="0.4"
              stroke="#3A4866"
              strokeWidth="1.5"
            />
            {/* Rear Wing Louvres & Gurney Flap */}
            <line x1="45" y1="65" x2="85" y2="62" stroke="#19B8C9" strokeWidth="1.5" />
            <line x1="45" y1="80" x2="85" y2="77" stroke="#19B8C9" strokeWidth="1.5" />

            {/* Rear Pullrod/Pushrod & Driveshaft Linkage */}
            <line x1="160" y1="180" x2="235" y2="245" stroke="#19B8C9" strokeWidth="3" strokeLinecap="round" />
            <line x1="160" y1="225" x2="235" y2="255" stroke="#FFC247" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="160" y1="265" x2="235" y2="275" stroke="#4E5D78" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* ============================================================== */}
        {/* DOMINANT 18-INCH PIRELLI WHEEL & SUSPENSION ASSEMBLY */}
        {/* Centered around X: 270, Y: 245 with Camber Angle Tilt */}
        {/* ============================================================== */}
        <g transform={`rotate(${camberDeg}, 270, 330)`}>
          {/* Tyre Slick Tread Outer Profile (Cross-Section) - authentic 405mm rear vs 305mm front */}
          <rect
            x={isRear ? "175" : "200"}
            y="130"
            width={isRear ? "190" : "140"}
            height="200"
            rx="24"
            fill="#090D15"
            stroke="#19B8C9"
            strokeWidth="3"
            filter="url(#tyreCyanGlow)"
          />

          {/* Tyre Sidewall Shoulder Chamfer */}
          <path
            d={isRear ? "M 190 130 C 180 150, 180 310, 190 330" : "M 215 130 C 205 150, 205 310, 215 330"}
            fill="none"
            stroke="#2B354C"
            strokeWidth="2"
          />
          <path
            d={isRear ? "M 350 130 C 360 150, 360 310, 350 330" : "M 325 130 C 335 150, 335 310, 325 330"}
            fill="none"
            stroke="#2B354C"
            strokeWidth="2"
          />

          {/* 18-Inch BBS Forged Magnesium Rim */}
          <circle cx="270" cy="230" r="76" fill="#121826" stroke="#3A4866" strokeWidth="3" />
          <circle cx="270" cy="230" r="68" fill="#0D111A" stroke="#1E2740" strokeWidth="2" strokeDasharray="14 8" />

          {/* Carbon-Carbon Ventilated Brake Disc */}
          <circle cx="270" cy="230" r="50" fill="#151A24" stroke="#4E5D78" strokeWidth="2" />
          {/* Radial Cooling Drill Holes */}
          <circle cx="270" cy="230" r="42" fill="none" stroke="#FF4458" strokeWidth="1.5" strokeDasharray="4 6" strokeOpacity="0.8" />
          <circle cx="270" cy="230" r="35" fill="none" stroke="#FF4458" strokeWidth="1.2" strokeDasharray="3 5" strokeOpacity="0.7" />

          {/* Monobloc 6-Piston Carbon Brake Caliper */}
          <path
            d="M 235 195 
               C 248 185, 275 185, 288 195 
               L 292 215 
               C 280 220, 245 220, 232 215 
               Z"
            fill="#FF4458"
            stroke="#FF4458"
            strokeWidth="2"
            filter="url(#accentGlow)"
          />
          {/* Caliper Bleed Nipples & Fluid Line */}
          <circle cx="250" cy="192" r="2" fill="#FFFFFF" />
          <circle cx="275" cy="192" r="2" fill="#FFFFFF" />

          {/* Wheel Hub Center Lock Nut (Torque Spec) */}
          <circle cx="270" cy="230" r="22" fill="#07090F" stroke="#19B8C9" strokeWidth="2.5" />
          <polygon
            points="270,214 284,222 284,238 270,246 256,238 256,222"
            fill="#121826"
            stroke="#19B8C9"
            strokeWidth="1.5"
          />
          <circle cx="270" cy="230" r="6" fill="#3DFF8F" />

          {/* Brake Duct Cooling Scoop & Aerodynamic Wheel Deflector */}
          <path
            d="M 205 180 C 195 195, 195 240, 205 255 L 215 250 C 210 240, 210 200, 215 185 Z"
            fill="#1A2234"
            stroke="#19B8C9"
            strokeWidth="1.5"
          />

          {/* Vertical Camber Axis Alignment Guide */}
          <line
            x1="270"
            y1="90"
            x2="270"
            y2="350"
            stroke="#3DFF8F"
            strokeWidth="1"
            strokeDasharray="8 4"
            strokeOpacity="0.6"
          />
        </g>
      </g>
    </svg>
  );
};
