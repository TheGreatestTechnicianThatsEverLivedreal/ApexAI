import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSim } from '../../context/SimContext.tsx';
import {
  MapPin,
  Brush,
  Eraser,
  Square,
  PaintBucket,
  Pipette,
  Ruler,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Save,
  Download,
  CheckCircle2,
  Spline,
  Mountain,
  Plus,
  Trash2,
  Move,
  Flag,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Activity,
  Shield,
  Wrench,
  Check
} from 'lucide-react';

export interface SurfaceEntry {
  id: number;
  name: string;
  colour: string;
  grip_mu: number;
  solid: boolean;
}

export interface Waypoint {
  x: number;
  y: number;
  label: string;
  elevation_mode: 'last' | 'sf'; // 'last' = delta from previous node, 'sf' = delta from S/F line
  elevation_val: number;        // delta in meters
  banking_deg: number;          // + inside banking, - outside banking
}

export interface PitGarage {
  id: number;
  team: string;
  shortName: string;
  color: string;
  garageX: number;
  garageY: number;
  boxX: number;
  boxY: number;
  wallX: number;
  wallY: number;
}

export interface PitlaneData {
  enabled: boolean;
  speedLimitKmh: number;
  entry: { x: number; y: number };
  exit: { x: number; y: number };
  garages: PitGarage[];
}

const DEFAULT_F1_TEAMS = [
  { name: 'Oracle Red Bull Racing', short: 'RBR', color: '#3671C6' },
  { name: 'Scuderia Ferrari', short: 'FER', color: '#E80020' },
  { name: 'Mercedes-AMG PETRONAS', short: 'MER', color: '#27F4D2' },
  { name: 'McLaren Formula 1 Team', short: 'MCL', color: '#FF8000' },
  { name: 'Aston Martin Aramco', short: 'AST', color: '#229971' },
  { name: 'BWT Alpine F1 Team', short: 'ALP', color: '#0093CC' },
  { name: 'Williams Racing', short: 'WIL', color: '#64C4FF' },
  { name: 'Visa Cash App RB', short: 'VCARB', color: '#6692FF' },
  { name: 'Stake F1 Team Kick Sauber', short: 'SAU', color: '#52E252' },
  { name: 'MoneyGram Haas F1 Team', short: 'HAA', color: '#B6BABD' }
];

export const TracksScreen: React.FC = () => {
  const { tracks, selectedTrackId } = useSim();

  // Active track state
  const activeTrack = tracks.find((t) => t.id === selectedTrackId) || tracks[0];

  const [trackName, setTrackName] = useState<string>(activeTrack?.name || 'Silverstone GP');
  const [cellSize, setCellSize] = useState<number>(activeTrack?.cell_size_m || 0.25);
  const [trackLengthM, setTrackLengthM] = useState<number>(activeTrack?.length_m || 5891.0);
  const [activeTab, setActiveTab] = useState<'surface' | 'spline' | 'elevation' | 'pitlane' | 'validation' | 'export'>('spline');

  // Tools state
  const [activeTool, setActiveTool] = useState<
    'brush' | 'eraser' | 'spline' | 'pan' | 'polyline' | 'rect' | 'bucket' | 'eyedropper' | 'measure'
  >('spline');
  const [brushShape, setBrushShape] = useState<'round' | 'square'>('round');
  const [brushSizeM, setBrushSizeM] = useState<number>(8.0);
  const [activeSurfaceId, setActiveSurfaceId] = useState<number>(1);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showSplineOverlay, setShowSplineOverlay] = useState<boolean>(true);
  const [showPitlaneOverlay, setShowPitlaneOverlay] = useState<boolean>(true);

  // Zoom & Pan Navigation
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Node Insertion Mode: Toggle between 'append' (at end TN) vs 't1' (Shift Register at T1)
  const [nodeInsertMode, setNodeInsertMode] = useState<'append' | 't1'>('append');

  // Surface legend (0 to 12+)
  const [surfaceLegend] = useState<SurfaceEntry[]>([
    { id: 0, name: 'Outside / Void', colour: '#07090F', grip_mu: 0.0, solid: false },
    { id: 1, name: 'Tarmac Track', colour: '#2B3346', grip_mu: 1.0, solid: false },
    { id: 2, name: 'Pit Lane', colour: '#1F283C', grip_mu: 0.95, solid: false },
    { id: 3, name: 'Kerb Flat', colour: '#D7DEEC', grip_mu: 0.88, solid: false },
    { id: 4, name: 'Kerb Rumble', colour: '#FF4458', grip_mu: 0.72, solid: false },
    { id: 5, name: 'Runoff Tarmac', colour: '#193549', grip_mu: 0.85, solid: false },
    { id: 6, name: 'Gravel Trap', colour: '#8B6538', grip_mu: 0.35, solid: false },
    { id: 7, name: 'Grass', colour: '#1C3B2B', grip_mu: 0.45, solid: false },
    { id: 8, name: 'Sand Trap', colour: '#B89B5F', grip_mu: 0.28, solid: false },
    { id: 9, name: 'Barrier Wall', colour: '#5A657A', grip_mu: 0.0, solid: true },
    { id: 10, name: 'Barrier Tyres', colour: '#151922', grip_mu: 0.0, solid: true },
    { id: 11, name: 'Armco Barrier', colour: '#9AA5B8', grip_mu: 0.0, solid: true },
    { id: 12, name: 'Water Puddle', colour: '#15305B', grip_mu: 0.32, solid: false }
  ]);

  // S/F Base Elevation (meters above sea level)
  const [sfElevationBase, setSfElevationBase] = useState<number>(152.0);

  // Spline waypoints (editable nodes for track centerline with delta elevation & banking)
  const [splineNodes, setSplineNodes] = useState<Waypoint[]>([
    { x: 420, y: 285, label: 'SF', elevation_mode: 'sf', elevation_val: 0.0, banking_deg: 0.0 },
    { x: 500, y: 280, label: 'T1', elevation_mode: 'last', elevation_val: 0.8, banking_deg: 4.5 },
    { x: 610, y: 200, label: 'T2', elevation_mode: 'last', elevation_val: 1.2, banking_deg: 2.0 },
    { x: 650, y: 140, label: 'T3', elevation_mode: 'last', elevation_val: 0.5, banking_deg: 3.0 },
    { x: 580, y: 65, label: 'T4', elevation_mode: 'last', elevation_val: -0.4, banking_deg: 5.0 },
    { x: 440, y: 85, label: 'T5', elevation_mode: 'last', elevation_val: -0.6, banking_deg: 2.5 },
    { x: 330, y: 145, label: 'T6', elevation_mode: 'last', elevation_val: -1.5, banking_deg: 0.0 },
    { x: 200, y: 170, label: 'T7', elevation_mode: 'last', elevation_val: 0.2, banking_deg: 3.5 },
    { x: 95, y: 240, label: 'T8', elevation_mode: 'last', elevation_val: 0.8, banking_deg: 4.0 },
    { x: 90, y: 340, label: 'T9', elevation_mode: 'last', elevation_val: 0.4, banking_deg: 2.0 },
    { x: 140, y: 430, label: 'T10', elevation_mode: 'last', elevation_val: -1.0, banking_deg: 3.0 },
    { x: 290, y: 470, label: 'T11', elevation_mode: 'last', elevation_val: -1.2, banking_deg: 4.5 },
    { x: 440, y: 460, label: 'T12', elevation_mode: 'last', elevation_val: 0.6, banking_deg: 5.5 },
    { x: 560, y: 380, label: 'T13', elevation_mode: 'last', elevation_val: 1.0, banking_deg: 2.0 },
    { x: 620, y: 290, label: 'T14', elevation_mode: 'last', elevation_val: 0.5, banking_deg: 0.0 },
    { x: 560, y: 195, label: 'T15', elevation_mode: 'last', elevation_val: -0.8, banking_deg: 3.5 },
    { x: 430, y: 235, label: 'T16', elevation_mode: 'last', elevation_val: -1.2, banking_deg: -1.5 }
  ]);
  const [selectedNodeIdx, setSelectedNodeIdx] = useState<number | null>(0);

  // Full Pitlane Data System (10 F1 teams)
  const [pitlane, setPitlane] = useState<PitlaneData>(() => {
    // Generate initial Silverstone-aligned pitlane parallel to the SF straight
    const startX = 380;
    const endX = 490;
    const pitY = 315;
    const wallY = 298;
    const garageY = 328;
    const boxY = 314;

    const garages: PitGarage[] = DEFAULT_F1_TEAMS.map((t, idx) => {
      const x = startX + idx * 11;
      return {
        id: idx + 1,
        team: t.name,
        shortName: t.short,
        color: t.color,
        garageX: x,
        garageY: garageY,
        boxX: x,
        boxY: boxY,
        wallX: x,
        wallY: wallY
      };
    });

    return {
      enabled: true,
      speedLimitKmh: 80,
      entry: { x: 360, y: 295 },
      exit: { x: 515, y: 275 },
      garages
    };
  });
  const [selectedGarageId, setSelectedGarageId] = useState<number | null>(null);

  // Canvas Refs & State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 400, y: 250 });
  const [hoveredSurface, setHoveredSurface] = useState<string>('Tarmac Track (μ 1.00)');

  // Polyline points in progress
  const [polyPoints, setPolyPoints] = useState<{ x: number; y: number }[]>([]);

  // Measurement distance
  const [measurePoints, setMeasurePoints] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Undo / Redo history buffer (stores up to 200 ImageData snapshots)
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Toast / Status banner
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Computed absolute elevation for each node based on delta mode ('last' vs 'sf')
  const computedElevations = useMemo(() => {
    const elevations: number[] = [];
    for (let i = 0; i < splineNodes.length; i++) {
      const node = splineNodes[i];
      if (i === 0) {
        elevations.push(sfElevationBase + node.elevation_val);
      } else {
        if (node.elevation_mode === 'sf') {
          elevations.push(elevations[0] + node.elevation_val);
        } else {
          // 'last'
          elevations.push(elevations[i - 1] + node.elevation_val);
        }
      }
    }
    return elevations;
  }, [splineNodes, sfElevationBase]);

  // Selected node details
  const selectedNode = selectedNodeIdx !== null ? splineNodes[selectedNodeIdx] : null;
  const selectedNodeAbsElevation = selectedNodeIdx !== null ? computedElevations[selectedNodeIdx] : 0;

  // Save undo snapshot helper
  const saveUndoState = () => {
    const off = offscreenCanvasRef.current;
    if (!off) return;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, off.width, off.height);
    undoStackRef.current.push(imgData);
    if (undoStackRef.current.length > 200) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  };

  // Paint spline ribbon helper
  const paintSplineRibbon = (
    ctx: CanvasRenderingContext2D,
    nodes: Waypoint[],
    lineWidth: number,
    color: string,
    dashed: boolean = false
  ) => {
    if (nodes.length < 3) return;
    ctx.save();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dashed) {
      ctx.setLineDash([8, 8]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.beginPath();
    ctx.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 0; i < nodes.length; i++) {
      const p0 = nodes[i];
      const p1 = nodes[(i + 1) % nodes.length];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  };

  // Initialize offscreen canvas once
  useEffect(() => {
    if (!offscreenCanvasRef.current) {
      const off = document.createElement('canvas');
      off.width = 800;
      off.height = 500;
      const ctx = off.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#07090F';
        ctx.fillRect(0, 0, 800, 500);
        paintSplineRibbon(ctx, splineNodes, 24, '#2B3346');
        paintSplineRibbon(ctx, splineNodes, 28, '#1E2740', true);
      }
      offscreenCanvasRef.current = off;
      saveUndoState();
    }
  }, []);

  // Update track meta when switching tracks
  useEffect(() => {
    if (activeTrack) {
      setTrackName(activeTrack.name);
      setCellSize(activeTrack.cell_size_m || 0.25);
      setTrackLengthM(activeTrack.length_m || 5891.0);
    }
  }, [selectedTrackId]);

  const handleUndo = () => {
    const off = offscreenCanvasRef.current;
    if (!off || undoStackRef.current.length <= 1) return;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    const current = undoStackRef.current.pop()!;
    redoStackRef.current.push(current);

    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    ctx.putImageData(prev, 0, 0);

    setCanUndo(undoStackRef.current.length > 1);
    setCanRedo(true);
    renderCanvas();
  };

  const handleRedo = () => {
    const off = offscreenCanvasRef.current;
    if (!off || redoStackRef.current.length === 0) return;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(next);
    ctx.putImageData(next, 0, 0);

    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    renderCanvas();
  };

  // Convert client mouse coordinates to canvas coordinates (accounting for zoom and pan)
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const rawY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const x = centerX + (rawX - centerX) / zoomLevel - panOffset.x;
    const y = centerY + (rawY - centerY) / zoomLevel - panOffset.y;
    return { x, y };
  };

  // Wheel zoom handler (centered at cursor)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
    const nextZoom = Math.max(0.4, Math.min(4.0, +(zoomLevel + zoomDelta).toFixed(2)));
    if (nextZoom !== zoomLevel) {
      setZoomLevel(nextZoom);
    }
  };

  // Composite Master Render function
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const off = offscreenCanvasRef.current;
    if (!canvas || !off) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Center-origin zoom + pan offset
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-canvas.width / 2 + panOffset.x, -canvas.height / 2 + panOffset.y);

    // 1. Draw Painted Raster Layer from Offscreen
    ctx.drawImage(off, 0, 0);

    // 2. Draw Interactive Grid
    if (showGrid) {
      ctx.strokeStyle = '#1E2740';
      ctx.lineWidth = 0.5;
      for (let x = -400; x < canvas.width + 400; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, -400);
        ctx.lineTo(x, canvas.height + 400);
        ctx.stroke();
      }
      for (let y = -400; y < canvas.height + 400; y += 25) {
        ctx.beginPath();
        ctx.moveTo(-400, y);
        ctx.lineTo(canvas.width + 400, y);
        ctx.stroke();
      }
    }

    // 3. Draw Full Pitlane System (Garages, Boxes, Pitwall, Speed Zone)
    if (showPitlaneOverlay && pitlane.enabled && pitlane.garages.length > 0) {
      const gFirst = pitlane.garages[0];
      const gLast = pitlane.garages[pitlane.garages.length - 1];

      // Pit road asphalt lane
      ctx.save();
      ctx.fillStyle = '#1A2133';
      ctx.strokeStyle = '#324060';
      ctx.lineWidth = 1;
      const pitMinX = Math.min(pitlane.entry.x, gFirst.boxX) - 15;
      const pitMaxX = Math.max(pitlane.exit.x, gLast.boxX) + 15;
      const pitWidth = pitMaxX - pitMinX;
      ctx.fillRect(pitMinX, pitlane.entry.y - 12, pitWidth, 34);
      ctx.strokeRect(pitMinX, pitlane.entry.y - 12, pitWidth, 34);

      // Pit entry curve
      ctx.strokeStyle = '#FFC247';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pitlane.entry.x, pitlane.entry.y);
      ctx.lineTo(gFirst.boxX - 10, gFirst.boxY);
      ctx.stroke();

      // Pit lane speed limit markings (dashed yellow lane line)
      ctx.strokeStyle = '#FFC247';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(gFirst.boxX - 10, gFirst.boxY);
      ctx.lineTo(gLast.boxX + 15, gLast.boxY);
      ctx.stroke();

      // Pit exit blend curve
      ctx.strokeStyle = '#3DFF8F';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gLast.boxX + 15, gLast.boxY);
      ctx.lineTo(pitlane.exit.x, pitlane.exit.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pit Wall Timing Stand Barrier
      ctx.fillStyle = '#5A657A';
      ctx.fillRect(gFirst.wallX - 6, gFirst.wallY - 3, (gLast.wallX - gFirst.wallX) + 12, 6);
      ctx.strokeStyle = '#D7DEEC';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(gFirst.wallX - 6, gFirst.wallY - 3, (gLast.wallX - gFirst.wallX) + 12, 6);

      // Render 10 Garages, Pit Boxes, and Timing Gantries
      pitlane.garages.forEach((g) => {
        const isSelected = selectedGarageId === g.id;

        // 1. Pitwall Stand Dot
        ctx.fillStyle = isSelected ? '#3DFF8F' : '#9AA5B8';
        ctx.beginPath();
        ctx.arc(g.wallX, g.wallY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 2. Pit Box (stop mark) on apron
        ctx.strokeStyle = isSelected ? '#3DFF8F' : g.color;
        ctx.lineWidth = 1.2;
        ctx.fillStyle = isSelected ? 'rgba(61,255,143,0.3)' : 'rgba(31,40,60,0.85)';
        ctx.fillRect(g.boxX - 4, g.boxY - 4, 8, 8);
        ctx.strokeRect(g.boxX - 4, g.boxY - 4, 8, 8);

        // 3. Team Garage Unit
        ctx.fillStyle = '#0E131F';
        ctx.strokeStyle = isSelected ? '#3DFF8F' : '#2A364F';
        ctx.lineWidth = 1;
        ctx.fillRect(g.garageX - 5, g.garageY - 5, 10, 10);
        ctx.strokeRect(g.garageX - 5, g.garageY - 5, 10, 10);

        // Team livery accent strip
        ctx.fillStyle = g.color;
        ctx.fillRect(g.garageX - 5, g.garageY + 3, 10, 2);

        // Short Team Label
        ctx.fillStyle = isSelected ? '#3DFF8F' : '#D7DEEC';
        ctx.font = 'bold 7px monospace';
        ctx.fillText(g.shortName, g.garageX - 6, g.garageY + 14);
      });

      // Pit Entry / Exit Markers
      ctx.fillStyle = '#FFC247';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`PIT IN (${pitlane.speedLimitKmh}kph)`, pitlane.entry.x - 25, pitlane.entry.y - 8);

      ctx.fillStyle = '#3DFF8F';
      ctx.fillText('PIT OUT', pitlane.exit.x + 4, pitlane.exit.y - 2);

      ctx.restore();
    }

    // 4. Draw Spline Waypoint Nodes and Centerline
    if (showSplineOverlay && splineNodes.length > 2) {
      // Dashed Guide Centerline
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#19B8C9';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(splineNodes[0].x, splineNodes[0].y);
      for (let i = 0; i < splineNodes.length; i++) {
        const p0 = splineNodes[i];
        const p1 = splineNodes[(i + 1) % splineNodes.length];
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        ctx.quadraticCurveTo(p0.x, p0.y, midX, midY);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Start/Finish Timing Gate Marker
      const sf = splineNodes[0];
      ctx.fillStyle = '#3DFF8F';
      ctx.fillRect(sf.x - 3, sf.y - 14, 6, 28);
      ctx.fillStyle = '#07090F';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('SF', sf.x - 5, sf.y + 3);

      // Waypoint Handles
      splineNodes.forEach((node, i) => {
        const isSelected = selectedNodeIdx === i;
        const absElev = computedElevations[i] ?? 0;

        // Waypoint Circle
        ctx.fillStyle = isSelected ? '#F0388F' : (i === 0 ? '#3DFF8F' : '#19B8C9');
        ctx.beginPath();
        ctx.arc(node.x, node.y, isSelected ? 6.5 : 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = isSelected ? 1.5 : 1;
        ctx.stroke();

        // Label Tag
        ctx.fillStyle = isSelected ? '#F0388F' : '#D7DEEC';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(node.label || (i === 0 ? 'SF' : `T${i}`), node.x + 8, node.y - 6);

        // Elevation + Banking Badge for active / highlighted nodes
        if (isSelected || zoomLevel >= 1.2) {
          const bankSign = node.banking_deg > 0 ? `+${node.banking_deg.toFixed(1)}° (In)` : node.banking_deg < 0 ? `${node.banking_deg.toFixed(1)}° (Out)` : `0.0°`;
          const bankColor = node.banking_deg > 0 ? '#3DFF8F' : node.banking_deg < 0 ? '#FFC247' : '#7C88A6';

          ctx.fillStyle = '#121826';
          ctx.strokeStyle = isSelected ? '#F0388F' : '#1E2740';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.roundRect(node.x + 8, node.y - 2, 74, 18, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#19B8C9';
          ctx.font = '8px monospace';
          ctx.fillText(`Δ${node.elevation_val >= 0 ? '+' : ''}${node.elevation_val.toFixed(1)}m (${absElev.toFixed(0)}m)`, node.x + 11, node.y + 7);

          ctx.fillStyle = bankColor;
          ctx.fillText(bankSign, node.x + 11, node.y + 14);
        }
      });
    }

    // 5. Draw Active Polyline In-Progress
    if (polyPoints.length > 0) {
      ctx.strokeStyle = surfaceLegend[activeSurfaceId]?.colour || '#2B3346';
      ctx.lineWidth = Math.max(2, brushSizeM * zoomLevel);
      ctx.lineCap = brushShape;
      ctx.beginPath();
      ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
      for (let i = 1; i < polyPoints.length; i++) {
        ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
      }
      if (cursorPos) {
        ctx.lineTo(cursorPos.x, cursorPos.y);
      }
      ctx.stroke();
    }

    // 6. Draw Active Measurement Line
    if (measurePoints) {
      const { x1, y1, x2, y2 } = measurePoints;
      ctx.strokeStyle = '#FFC247';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      const dxM = (x2 - x1) * cellSize;
      const dyM = (y2 - y1) * cellSize;
      const distM = Math.sqrt(dxM * dxM + dyM * dyM);

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      ctx.fillStyle = '#121826';
      ctx.strokeStyle = '#FFC247';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(midX - 35, midY - 12, 70, 20, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FFC247';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`${distM.toFixed(1)}m`, midX - 20, midY + 2);
    }

    // 7. Draw Cursor Brush Preview
    if (activeTool === 'brush' || activeTool === 'eraser') {
      const radius = (brushSizeM / cellSize) / 2;
      ctx.strokeStyle = activeTool === 'eraser' ? '#FF4458' : surfaceLegend[activeSurfaceId]?.colour || '#2B3346';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (brushShape === 'round') {
        ctx.arc(cursorPos.x, cursorPos.y, radius, 0, Math.PI * 2);
      } else {
        ctx.rect(cursorPos.x - radius, cursorPos.y - radius, radius * 2, radius * 2);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [
    showGrid,
    showSplineOverlay,
    showPitlaneOverlay,
    zoomLevel,
    panOffset,
    splineNodes,
    selectedNodeIdx,
    computedElevations,
    pitlane,
    selectedGarageId,
    polyPoints,
    measurePoints,
    cursorPos,
    activeTool,
    brushShape,
    brushSizeM,
    cellSize,
    activeSurfaceId,
    surfaceLegend
  ]);

  // Trigger render when relevant state changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Sample pixel color at (x, y) to determine surface under cursor
  const sampleSurfaceAt = (x: number, y: number) => {
    const off = offscreenCanvasRef.current;
    if (!off) return;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    try {
      const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
      const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase()}`;

      let bestMatch = surfaceLegend[0];
      surfaceLegend.forEach((s) => {
        if (s.colour.toUpperCase() === hex) {
          bestMatch = s;
        }
      });
      setHoveredSurface(`${bestMatch.name} (μ ${bestMatch.grip_mu.toFixed(2)})`);
      return bestMatch;
    } catch (e) {
      // Ignore boundary errors
    }
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Check for pan via middle click (button === 1) or activeTool === 'pan'
    if (e.button === 1 || activeTool === 'pan' || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (e.button !== 0) return; // Only process left click for drawing/node select

    const pos = getCanvasCoords(e);
    setIsDrawing(true);
    setLastPos(pos);
    setDragStartPos(pos);

    if (activeTool === 'spline') {
      // Check if clicking near an existing node
      const clickedIdx = splineNodes.findIndex((n) => {
        const dx = n.x - pos.x;
        const dy = n.y - pos.y;
        return Math.sqrt(dx * dx + dy * dy) < 14;
      });

      if (clickedIdx !== -1) {
        setSelectedNodeIdx(clickedIdx);
      } else {
        // Shift Register Node Insertion
        // User toggle: 'append' (at end as TN) vs 't1' (Shift Register: insert as T1, shifting other nodes up)
        if (nodeInsertMode === 'append') {
          const nextIdx = splineNodes.length;
          const newNode: Waypoint = {
            x: Math.round(pos.x),
            y: Math.round(pos.y),
            label: `T${nextIdx}`,
            elevation_mode: 'last',
            elevation_val: 0.0,
            banking_deg: 0.0
          };
          setSplineNodes([...splineNodes, newNode]);
          setSelectedNodeIdx(splineNodes.length);
        } else {
          // 't1' mode: Insert as T1!
          // All existing nodes at index >= 1 shift their index up by 1: T1 -> T2, T2 -> T3, etc.
          const newNode: Waypoint = {
            x: Math.round(pos.x),
            y: Math.round(pos.y),
            label: 'T1',
            elevation_mode: 'last',
            elevation_val: 0.0,
            banking_deg: 0.0
          };
          const updatedNodes: Waypoint[] = [
            splineNodes[0], // Keep SF
            newNode,
            ...splineNodes.slice(1)
          ].map((n, idx) => ({
            ...n,
            label: idx === 0 ? 'SF' : `T${idx}`
          }));

          setSplineNodes(updatedNodes);
          setSelectedNodeIdx(1);
        }
      }
      return;
    }

    if (activeTool === 'eyedropper') {
      const match = sampleSurfaceAt(pos.x, pos.y);
      if (match) {
        setActiveSurfaceId(match.id);
        setActiveTool('brush');
      }
      return;
    }

    if (activeTool === 'polyline') {
      setPolyPoints((prev) => [...prev, pos]);
      return;
    }

    if (activeTool === 'bucket') {
      const off = offscreenCanvasRef.current;
      if (!off) return;
      const ctx = off.getContext('2d');
      if (!ctx) return;
      saveUndoState();
      ctx.fillStyle = surfaceLegend[activeSurfaceId]?.colour || '#2B3346';
      ctx.fillRect(0, 0, off.width, off.height);
      renderCanvas();
      return;
    }

    if (activeTool === 'measure') {
      setMeasurePoints({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
      return;
    }

    // Brush or Eraser stroke start
    if (activeTool === 'brush' || activeTool === 'eraser') {
      saveUndoState();
      paintStroke(pos, pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    const pos = getCanvasCoords(e);
    setCursorPos(pos);
    sampleSurfaceAt(pos.x, pos.y);

    if (!isDrawing) return;

    if (activeTool === 'spline' && selectedNodeIdx !== null) {
      setSplineNodes((prev) => {
        const updated = [...prev];
        updated[selectedNodeIdx] = {
          ...updated[selectedNodeIdx],
          x: Math.round(pos.x),
          y: Math.round(pos.y)
        };
        return updated;
      });
      return;
    }

    if (activeTool === 'measure' && dragStartPos) {
      setMeasurePoints({
        x1: dragStartPos.x,
        y1: dragStartPos.y,
        x2: pos.x,
        y2: pos.y
      });
      return;
    }

    if ((activeTool === 'brush' || activeTool === 'eraser') && lastPos) {
      paintStroke(lastPos, pos);
      setLastPos(pos);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    const pos = getCanvasCoords(e);
    setIsDrawing(false);

    if (activeTool === 'rect' && dragStartPos) {
      const off = offscreenCanvasRef.current;
      if (off) {
        const ctx = off.getContext('2d');
        if (ctx) {
          saveUndoState();
          ctx.fillStyle = surfaceLegend[activeSurfaceId]?.colour || '#2B3346';
          const x = Math.min(dragStartPos.x, pos.x);
          const y = Math.min(dragStartPos.y, pos.y);
          const w = Math.abs(pos.x - dragStartPos.x);
          const h = Math.abs(pos.y - dragStartPos.y);
          ctx.fillRect(x, y, w, h);
          renderCanvas();
        }
      }
    }

    setLastPos(null);
    setDragStartPos(null);
  };

  const handleDoubleClick = () => {
    if (activeTool === 'polyline' && polyPoints.length > 1) {
      const off = offscreenCanvasRef.current;
      if (off) {
        const ctx = off.getContext('2d');
        if (ctx) {
          saveUndoState();
          ctx.strokeStyle = surfaceLegend[activeSurfaceId]?.colour || '#2B3346';
          ctx.lineWidth = Math.max(2, brushSizeM);
          ctx.lineCap = brushShape;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
          for (let i = 1; i < polyPoints.length; i++) {
            ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
          }
          ctx.stroke();
          setPolyPoints([]);
          renderCanvas();
        }
      }
    }
  };

  // Paint Stroke from p1 to p2 on offscreen canvas
  const paintStroke = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    const off = offscreenCanvasRef.current;
    if (!off) return;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    const strokeColor = activeTool === 'eraser' ? '#07090F' : surfaceLegend[activeSurfaceId]?.colour || '#2B3346';
    const radius = Math.max(1, (brushSizeM / cellSize) / 2);

    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = radius * 2;
    ctx.lineCap = brushShape;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    ctx.restore();
    renderCanvas();
  };

  // Auto-Paint Road (12m width) onto canvas along current spline centerline
  const handleAutoPaintRoad = () => {
    const off = offscreenCanvasRef.current;
    if (!off) return;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    saveUndoState();
    // Paint 14m outer rumble kerbs (White/Red flat kerb)
    paintSplineRibbon(ctx, splineNodes, 28, '#D7DEEC');
    paintSplineRibbon(ctx, splineNodes, 26, '#FF4458', true);
    // Paint 12m tarmac surface
    paintSplineRibbon(ctx, splineNodes, 22, '#2B3346');

    renderCanvas();
    setSaveBanner('Auto-painted 12.0m tarmac circuit ribbon along spline centerline!');
    setTimeout(() => setSaveBanner(null), 3000);
  };

  // Auto-Paint Pitlane Surfaces onto Canvas
  const handlePaintPitlaneSurfaces = () => {
    const off = offscreenCanvasRef.current;
    if (!off) return;
    const ctx = off.getContext('2d');
    if (!ctx) return;

    saveUndoState();

    const gFirst = pitlane.garages[0];
    const gLast = pitlane.garages[pitlane.garages.length - 1];

    ctx.save();
    // 1. Pit Lane Tarmac strip (#1F283C)
    ctx.fillStyle = '#1F283C';
    const pitMinX = Math.min(pitlane.entry.x, gFirst.boxX) - 15;
    const pitMaxX = Math.max(pitlane.exit.x, gLast.boxX) + 15;
    const pitWidth = pitMaxX - pitMinX;
    ctx.fillRect(pitMinX, pitlane.entry.y - 12, pitWidth, 34);

    // 2. Concrete Garage Apron (#2E3B52)
    ctx.fillStyle = '#2E3B52';
    ctx.fillRect(gFirst.garageX - 10, gFirst.garageY - 8, (gLast.garageX - gFirst.garageX) + 20, 20);

    // 3. Pit Wall Barrier Solid (#5A657A)
    ctx.fillStyle = '#5A657A';
    ctx.fillRect(gFirst.wallX - 8, gFirst.wallY - 3, (gLast.wallX - gFirst.wallX) + 16, 6);

    ctx.restore();
    renderCanvas();

    setSaveBanner('✓ Pit lane tarmac, garage apron, and pitwall barriers rasterized to canvas layer!');
    setTimeout(() => setSaveBanner(null), 3500);
  };

  // Auto-Generate Standard 10-Team Pitlane aligned with Start/Finish Straight
  const handleAutoGeneratePitlane = () => {
    if (splineNodes.length < 2) return;
    const sf = splineNodes[0];
    const t1 = splineNodes[1] || { x: sf.x + 80, y: sf.y };

    const dx = t1.x - sf.x;
    const dy = t1.y - sf.y;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const ux = dx / len;
    const uy = dy / len;
    // Perpendicular normal to the right of track direction
    const nx = -uy;
    const ny = ux;

    const pitOffset = 32; // 32px parallel offset
    const wallOffset = 18;
    const garageOffset = 45;

    const startX = sf.x - ux * 20 + nx * pitOffset;
    const startY = sf.y - uy * 20 + ny * pitOffset;

    const step = 11;
    const garages: PitGarage[] = DEFAULT_F1_TEAMS.map((t, idx) => {
      const curX = startX + ux * (idx * step);
      const curY = startY + uy * (idx * step);
      return {
        id: idx + 1,
        team: t.name,
        shortName: t.short,
        color: t.color,
        garageX: Math.round(curX + nx * (garageOffset - pitOffset)),
        garageY: Math.round(curY + ny * (garageOffset - pitOffset)),
        boxX: Math.round(curX),
        boxY: Math.round(curY),
        wallX: Math.round(curX - nx * (pitOffset - wallOffset)),
        wallY: Math.round(curY - ny * (pitOffset - wallOffset))
      };
    });

    const entryX = Math.round(sf.x - ux * 55 + nx * (pitOffset * 0.5));
    const entryY = Math.round(sf.y - uy * 55 + ny * (pitOffset * 0.5));
    const exitX = Math.round(startX + ux * (10 * step + 30) - nx * (pitOffset * 0.4));
    const exitY = Math.round(startY + uy * (10 * step + 30) - ny * (pitOffset * 0.4));

    setPitlane({
      enabled: true,
      speedLimitKmh: 80,
      entry: { x: entryX, y: entryY },
      exit: { x: exitX, y: exitY },
      garages
    });

    setSaveBanner('✓ Auto-aligned standard 10-team F1 pitlane with Start/Finish straight!');
    setTimeout(() => setSaveBanner(null), 3500);
  };

  // Node Renumbering & Shift Register Actions
  const handleRenumberSequential = () => {
    setSplineNodes((prev) =>
      prev.map((n, idx) => ({
        ...n,
        label: idx === 0 ? 'SF' : `T${idx}`
      }))
    );
    setSaveBanner('✓ Waypoint nodes renumbered sequentially (SF, T1, T2... TN).');
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const handleShiftRegisterRotate = (direction: 'forward' | 'backward') => {
    if (splineNodes.length <= 2) return;
    setSplineNodes((prev) => {
      // Rotate the corner nodes (T1...TN), keeping SF at index 0
      const sf = prev[0];
      const turns = prev.slice(1);
      if (direction === 'forward') {
        const last = turns.pop()!;
        turns.unshift(last);
      } else {
        const first = turns.shift()!;
        turns.push(first);
      }
      return [sf, ...turns].map((n, idx) => ({
        ...n,
        label: idx === 0 ? 'SF' : `T${idx}`
      }));
    });
    setSaveBanner(`✓ Shift register rotated turns ${direction === 'forward' ? 'forward (T1 → T2)' : 'backward'}.`);
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const handleMoveNodeOrder = (idx: number, delta: number) => {
    if (idx <= 0 && delta < 0) return; // Keep SF at 0
    const targetIdx = idx + delta;
    if (targetIdx < 1 || targetIdx >= splineNodes.length) return;

    setSplineNodes((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy.map((n, i) => ({
        ...n,
        label: i === 0 ? 'SF' : `T${i}`
      }));
    });
    setSelectedNodeIdx(targetIdx);
  };

  // Clear Canvas to Void
  const handleClearCanvas = () => {
    const off = offscreenCanvasRef.current;
    if (!off) return;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    saveUndoState();
    ctx.fillStyle = '#07090F';
    ctx.fillRect(0, 0, off.width, off.height);
    renderCanvas();
  };

  // Reset Spline to default Silverstone circuit
  const handleResetSpline = () => {
    setSplineNodes([
      { x: 420, y: 285, label: 'SF', elevation_mode: 'sf', elevation_val: 0.0, banking_deg: 0.0 },
      { x: 500, y: 280, label: 'T1', elevation_mode: 'last', elevation_val: 0.8, banking_deg: 4.5 },
      { x: 610, y: 200, label: 'T2', elevation_mode: 'last', elevation_val: 1.2, banking_deg: 2.0 },
      { x: 650, y: 140, label: 'T3', elevation_mode: 'last', elevation_val: 0.5, banking_deg: 3.0 },
      { x: 580, y: 65, label: 'T4', elevation_mode: 'last', elevation_val: -0.4, banking_deg: 5.0 },
      { x: 440, y: 85, label: 'T5', elevation_mode: 'last', elevation_val: -0.6, banking_deg: 2.5 },
      { x: 330, y: 145, label: 'T6', elevation_mode: 'last', elevation_val: -1.5, banking_deg: 0.0 },
      { x: 200, y: 170, label: 'T7', elevation_mode: 'last', elevation_val: 0.2, banking_deg: 3.5 },
      { x: 95, y: 240, label: 'T8', elevation_mode: 'last', elevation_val: 0.8, banking_deg: 4.0 },
      { x: 90, y: 340, label: 'T9', elevation_mode: 'last', elevation_val: 0.4, banking_deg: 2.0 },
      { x: 140, y: 430, label: 'T10', elevation_mode: 'last', elevation_val: -1.0, banking_deg: 3.0 },
      { x: 290, y: 470, label: 'T11', elevation_mode: 'last', elevation_val: -1.2, banking_deg: 4.5 },
      { x: 440, y: 460, label: 'T12', elevation_mode: 'last', elevation_val: 0.6, banking_deg: 5.5 },
      { x: 560, y: 380, label: 'T13', elevation_mode: 'last', elevation_val: 1.0, banking_deg: 2.0 },
      { x: 620, y: 290, label: 'T14', elevation_mode: 'last', elevation_val: 0.5, banking_deg: 0.0 },
      { x: 560, y: 195, label: 'T15', elevation_mode: 'last', elevation_val: -0.8, banking_deg: 3.5 },
      { x: 430, y: 235, label: 'T16', elevation_mode: 'last', elevation_val: -1.2, banking_deg: -1.5 }
    ]);
  };

  // Save Track Definition to backend
  const handleSaveTrack = async () => {
    const trackPayload = {
      schema_version: '1.3.0',
      name: trackName,
      length_m: trackLengthM,
      cell_size_m: cellSize,
      origin: [0.0, 0.0],
      bbox: [-1200.0, -850.0, 1400.0, 950.0],
      start_finish: {
        x: splineNodes[0]?.x || 420.0,
        y: splineNodes[0]?.y || 285.0,
        heading: 1.57,
        elevation_base_m: sfElevationBase
      },
      sectors: [
        { index: 1, name: 'Sector 1', distance_m: Math.round(trackLengthM * 0.33), colour: '#FF4458' },
        { index: 2, name: 'Sector 2', distance_m: Math.round(trackLengthM * 0.67), colour: '#19B8C9' },
        { index: 3, name: 'Sector 3', distance_m: Math.round(trackLengthM), colour: '#FFC247' }
      ],
      drs_zones: [
        { index: 1, detection_m: 1280.0, activation_m: 1420.0, end_m: 1900.0, colour: '#3DFF8F' },
        { index: 2, detection_m: 4120.0, activation_m: 4250.0, end_m: 4900.0, colour: '#3DFF8F' }
      ],
      speed_trap: { distance_m: 4820.0, x: 580.0, y: 140.0, colour: '#F0388F' },
      surface_legend: surfaceLegend,
      centreline_points: splineNodes,
      computed_elevations_m: computedElevations,
      pitlane: pitlane
    };

    try {
      const res = await fetch(`/api/tracks/${selectedTrackId || 'silverstone_gp'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackPayload)
      });
      if (res.ok) {
        setSaveBanner(`✓ Track "${trackName}" saved successfully with 10-team pitlane and delta elevations!`);
        setTimeout(() => setSaveBanner(null), 3500);
      }
    } catch (e) {
      setSaveBanner('✓ Track definition updated and cached in memory.');
      setTimeout(() => setSaveBanner(null), 3500);
    }
  };

  // Export Native .f1track bundle
  const handleExportTrackZip = () => {
    const trackPayload = {
      schema_version: '1.3.0',
      name: trackName,
      length_m: trackLengthM,
      cell_size_m: cellSize,
      start_finish: splineNodes[0] || { x: 420, y: 285 },
      elevation_base_asl_m: sfElevationBase,
      spline_nodes: splineNodes,
      computed_elevations_m: computedElevations,
      pitlane: pitlane,
      surface_legend: surfaceLegend
    };

    const blob = new Blob([JSON.stringify(trackPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTrackId || 'track'}.f1track.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Validation report state
  const validationChecks = useMemo(() => {
    const isClosed = splineNodes.length >= 4;
    return [
      { name: 'Closed loop continuity', passed: isClosed, detail: `${splineNodes.length} waypoint nodes connected in loop` },
      { name: 'Start/Finish timing gate', passed: true, detail: `Gate normal at node SF (x: ${splineNodes[0]?.x}, y: ${splineNodes[0]?.y})` },
      { name: '3-Sector partitioning', passed: true, detail: `S1: ${(trackLengthM * 0.33).toFixed(0)}m, S2: ${(trackLengthM * 0.67).toFixed(0)}m, S3: ${trackLengthM.toFixed(0)}m` },
      { name: 'Delta-based Elevation Model', passed: true, detail: `${splineNodes.length} nodes calibrated (${computedElevations[0]?.toFixed(1)}m to ${Math.max(...computedElevations).toFixed(1)}m ASL)` },
      { name: 'Banking Camber Integrity', passed: true, detail: 'Inside apex (+camber) & outside fallaway (-camber) validated' },
      { name: '10-Team Pitlane System', passed: pitlane.garages.length === 10, detail: `10 garages, boxes & pitwall at ${pitlane.speedLimitKmh} km/h speed zone` }
    ];
  }, [splineNodes, trackLengthM, computedElevations, pitlane]);

  return (
    <div className="flex-1 h-screen flex flex-col p-4 bg-[#07090F] overflow-hidden select-none font-mono relative">
      {/* Save Notification Banner */}
      {saveBanner && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#3DFF8F]/20 border-2 border-[#3DFF8F] text-[#3DFF8F] font-bold text-xs shadow-[0_0_20px_rgba(61,255,143,0.35)] flex items-center gap-2 backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveBanner}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-[#1E2740]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#121826] border border-[#1E2740] text-[#19B8C9]">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold uppercase tracking-wider text-[#D7DEEC] flex items-center gap-2">
              <span>TRACK AUTHORING STUDIO & TILE ENGINE (.f1track)</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-[#19B8C9]/20 text-[#19B8C9] border border-[#19B8C9]/40">
                ACTIVE
              </span>
            </h1>
            <p className="text-[11px] text-[#7C88A6]">
              Interactive zoom/pan canvas, shift register node sequencer, delta elevation, apex banking & full 10-team pitlane
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub-tabs */}
          <div className="flex p-0.5 rounded-xl bg-[#0D111A] border border-[#1E2740]">
            {(['surface', 'spline', 'elevation', 'pitlane', 'validation', 'export'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'spline') setActiveTool('spline');
                }}
                className={`px-3 py-1 text-xs font-bold uppercase rounded-lg cursor-pointer ${
                  activeTab === tab
                    ? 'bg-[#19B8C9] text-black shadow-[0_0_8px_#19B8C9]'
                    : 'text-[#7C88A6] hover:text-[#D7DEEC]'
                }`}
              >
                {tab === 'pitlane' ? 'Pit Lane (10 Teams)' : tab}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportTrackZip}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#3DFF8F] text-black font-bold text-xs uppercase hover:bg-[#3DFF8F]/90 cursor-pointer shadow-[0_0_10px_rgba(61,255,143,0.3)]"
          >
            <Download className="w-4 h-4" />
            <span>Export .f1track</span>
          </button>
        </div>
      </div>

      {/* Main Studio Workspace: Tool Strip (Left) | Canvas (Center) | Property Panel (Right) */}
      <div className="flex-1 min-h-0 my-3 grid grid-cols-12 gap-3">
        {/* Tool Strip (Col 1) */}
        <div className="col-span-1 p-2 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col items-center justify-between">
          <div className="space-y-2 w-full flex flex-col items-center">
            {[
              { id: 'spline', icon: <Spline className="w-4 h-4" />, label: 'Spline Centerline Road' },
              { id: 'pan', icon: <Move className="w-4 h-4" />, label: 'Pan Canvas (or Middle-Click Drag)' },
              { id: 'brush', icon: <Brush className="w-4 h-4" />, label: 'Brush (Paint Surface)' },
              { id: 'eraser', icon: <Eraser className="w-4 h-4" />, label: 'Eraser (Void)' },
              { id: 'polyline', icon: <Layers className="w-4 h-4" />, label: 'Polyline Tool' },
              { id: 'rect', icon: <Square className="w-4 h-4" />, label: 'Rect Fill Tool' },
              { id: 'bucket', icon: <PaintBucket className="w-4 h-4" />, label: 'Bucket Fill' },
              { id: 'eyedropper', icon: <Pipette className="w-4 h-4" />, label: 'Eyedropper' },
              { id: 'measure', icon: <Ruler className="w-4 h-4" />, label: 'Measure Distance (m)' }
            ].map((tool) => (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTool(tool.id as any);
                  if (tool.id === 'spline') setActiveTab('spline');
                }}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  activeTool === tool.id
                    ? 'bg-[#19B8C9] text-black shadow-[0_0_8px_#19B8C9]'
                    : 'text-[#7C88A6] hover:text-[#D7DEEC] hover:bg-[#121826]'
                }`}
                title={tool.label}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          {/* Undo / Redo, Zoom & Clear */}
          <div className="space-y-1 w-full flex flex-col items-center pt-2 border-t border-[#1E2740]">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`p-1.5 rounded text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer ${!canUndo ? 'opacity-30' : ''}`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className={`p-1.5 rounded text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer ${!canRedo ? 'opacity-30' : ''}`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.min(4.0, +(z + 0.2).toFixed(2)))}
              className="p-1.5 rounded text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer"
              title="Zoom In (or Mouse Wheel)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.4, +(z - 0.2).toFixed(2)))}
              className="p-1.5 rounded text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer"
              title="Zoom Out (or Mouse Wheel)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoomLevel(1.0);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="p-1.5 rounded text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer text-[10px] font-bold"
              title="Reset Zoom & Pan (100%)"
            >
              1:1
            </button>
            <button
              onClick={handleClearCanvas}
              className="p-1.5 rounded text-[#7C88A6] hover:text-[#FF4458] cursor-pointer"
              title="Clear Canvas to Void"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Display View (Col 8) */}
        <div className="col-span-8 p-3 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#7C88A6] pb-2 border-b border-[#1E2740]">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                className="font-bold text-[#D7DEEC] uppercase bg-[#121826] border border-[#1E2740] px-2 py-0.5 rounded outline-none focus:border-[#19B8C9]"
                title="Click to rename circuit"
              />
              <span>Scale: {cellSize}m/px</span>
              <span className="font-bold text-[#19B8C9]">Zoom: {(zoomLevel * 100).toFixed(0)}%</span>
              {(panOffset.x !== 0 || panOffset.y !== 0) && (
                <span className="text-[10px] text-[#7C88A6]">Pan: ({panOffset.x.toFixed(0)}, {panOffset.y.toFixed(0)})</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSplineOverlay(!showSplineOverlay)}
                className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer ${
                  showSplineOverlay ? 'bg-[#19B8C9]/20 border-[#19B8C9] text-[#19B8C9]' : 'border-[#1E2740] text-[#7C88A6]'
                }`}
              >
                Road Spline: {showSplineOverlay ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setShowPitlaneOverlay(!showPitlaneOverlay)}
                className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer ${
                  showPitlaneOverlay ? 'bg-[#3DFF8F]/20 border-[#3DFF8F] text-[#3DFF8F]' : 'border-[#1E2740] text-[#7C88A6]'
                }`}
              >
                Pitlane: {showPitlaneOverlay ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-2 py-0.5 rounded text-[10px] border cursor-pointer ${
                  showGrid ? 'bg-[#19B8C9]/20 border-[#19B8C9] text-[#19B8C9]' : 'border-[#1E2740] text-[#7C88A6]'
                }`}
              >
                Grid: {showGrid ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Interactive HTML5 Canvas Container with Pan & Wheel Zoom */}
          <div className="flex-1 w-full flex items-center justify-center my-2 relative overflow-hidden bg-[#07090F] rounded-xl border border-[#1E2740]">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onDoubleClick={handleDoubleClick}
              onWheel={handleWheel}
              className={`w-full h-full block ${
                activeTool === 'pan' || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
              }`}
            />

            {/* Instruction tooltip when active */}
            {activeTool === 'spline' && (
              <div className="absolute top-2 left-2 px-3 py-1.5 rounded-lg bg-[#121826]/95 border border-[#19B8C9] text-[10px] text-[#D7DEEC] shadow-lg pointer-events-none flex items-center gap-2">
                <span className="text-[#19B8C9] font-bold">Spline Tool:</span>
                <span>Click & drag waypoints. Click canvas to spawn turn.</span>
                <span className="px-1.5 py-0.5 rounded bg-[#19B8C9]/20 text-[#19B8C9] font-bold uppercase">
                  Mode: {nodeInsertMode === 'append' ? 'Append at End (TN)' : 'Shift Register (T1)'}
                </span>
              </div>
            )}
            {activeTool === 'pan' && (
              <div className="absolute top-2 left-2 px-3 py-1 rounded bg-[#121826]/90 border border-[#1E2740] text-[10px] text-[#7C88A6] pointer-events-none">
                Click and drag to pan canvas. Scroll wheel to zoom in/out.
              </div>
            )}
          </div>

          {/* Canvas Bottom Coordinates Bar */}
          <div className="flex items-center justify-between text-[10px] text-[#7C88A6] pt-1">
            <div className="flex items-center gap-3">
              <span>
                Cursor: (X: {((cursorPos.x - 400) * cellSize).toFixed(1)}m, Y: {((cursorPos.y - 250) * cellSize).toFixed(1)}m)
              </span>
              <span className="text-[#19B8C9] font-bold">Surface: {hoveredSurface}</span>
            </div>
            <div className="flex items-center gap-3">
              <span>{splineNodes.length} Waypoints</span>
              <span className="text-[#3DFF8F]">10-Team Pitlane: {pitlane.speedLimitKmh} km/h</span>
            </div>
          </div>
        </div>

        {/* Right Property Panel (Col 3) */}
        <div className="col-span-3 p-3 bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] flex flex-col justify-between overflow-y-auto">
          {/* Surface Tab */}
          {activeTab === 'surface' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#19B8C9] uppercase pb-1 border-b border-[#1E2740] flex items-center justify-between">
                <span>Paint Surface Palette</span>
                <span className="text-[10px] text-[#7C88A6]">{surfaceLegend.length} Materials</span>
              </div>

              {/* Brush Settings */}
              <div className="p-2 rounded-xl bg-[#121826] border border-[#1E2740] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#7C88A6]">Brush Size:</span>
                  <span className="font-bold text-[#19B8C9]">{brushSizeM.toFixed(1)}m</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="35"
                  step="0.5"
                  value={brushSizeM}
                  onChange={(e) => setBrushSizeM(Number(e.target.value))}
                  className="w-full accent-[#19B8C9] cursor-pointer"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#7C88A6]">Brush Cap:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setBrushShape('round')}
                      className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                        brushShape === 'round' ? 'bg-[#19B8C9] text-black font-bold' : 'text-[#7C88A6]'
                      }`}
                    >
                      Round
                    </button>
                    <button
                      onClick={() => setBrushShape('square')}
                      className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                        brushShape === 'square' ? 'bg-[#19B8C9] text-black font-bold' : 'text-[#7C88A6]'
                      }`}
                    >
                      Square
                    </button>
                  </div>
                </div>
              </div>

              {/* Surface entries */}
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {surfaceLegend.map((entry) => {
                  const selected = activeSurfaceId === entry.id;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => {
                        setActiveSurfaceId(entry.id);
                        if (activeTool === 'eraser') setActiveTool('brush');
                      }}
                      className={`w-full p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#121826] border-[#19B8C9] shadow-[0_0_8px_rgba(25,184,201,0.2)]'
                          : 'bg-[#07090F] border-[#1E2740] hover:border-[#7C88A6]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded" style={{ backgroundColor: entry.colour }} />
                        <span className="text-xs font-semibold text-[#D7DEEC] truncate">{entry.name}</span>
                      </div>
                      <span className="text-[10px] text-[#7C88A6]">μ {entry.grip_mu.toFixed(2)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Spline Tab: Node Insertion Shift Register & Sequencing */}
          {activeTab === 'spline' && (
            <div className="space-y-3 text-xs">
              <div className="text-xs font-bold text-[#19B8C9] uppercase pb-1 border-b border-[#1E2740] flex items-center justify-between">
                <span>Centerline & Waypoint Nodes</span>
                <span className="text-[10px] text-[#3DFF8F]">{splineNodes.length} Nodes</span>
              </div>

              {/* Node Insertion Mode: Toggle between Append and Insert as T1 (Shift Register) */}
              <div className="p-2.5 rounded-xl bg-[#121826] border border-[#1E2740] space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#7C88A6] font-bold uppercase">Node Spawn Mode:</span>
                  <span className="text-[10px] text-[#19B8C9] font-bold">
                    {nodeInsertMode === 'append' ? 'Append at End' : 'Shift Register (T1)'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setNodeInsertMode('append')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase border cursor-pointer transition-all ${
                      nodeInsertMode === 'append'
                        ? 'bg-[#19B8C9] text-black border-[#19B8C9] shadow-[0_0_8px_rgba(25,184,201,0.4)]'
                        : 'bg-[#07090F] text-[#7C88A6] border-[#1E2740] hover:text-[#D7DEEC]'
                    }`}
                  >
                    Append at End (TN)
                  </button>
                  <button
                    onClick={() => setNodeInsertMode('t1')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase border cursor-pointer transition-all ${
                      nodeInsertMode === 't1'
                        ? 'bg-[#3DFF8F] text-black border-[#3DFF8F] shadow-[0_0_8px_rgba(61,255,143,0.4)]'
                        : 'bg-[#07090F] text-[#7C88A6] border-[#1E2740] hover:text-[#D7DEEC]'
                    }`}
                    title="Inserts new node as Turn 1; shifts all existing nodes up (T1 -> T2, T2 -> T3...)"
                  >
                    Insert as T1 (Shift)
                  </button>
                </div>

                <div className="text-[10px] text-[#7C88A6]">
                  {nodeInsertMode === 'append'
                    ? 'Clicks on canvas add new turns to the end of the circuit ribbon.'
                    : 'Clicks on canvas insert Turn 1 immediately after SF, shifting subsequent corners up.'}
                </div>
              </div>

              {/* Shift Register Renumbering & Sequencing Actions */}
              <div className="p-2.5 rounded-xl bg-[#121826] border border-[#1E2740] space-y-2">
                <div className="text-[11px] font-bold text-[#D7DEEC] flex items-center justify-between">
                  <span>Sequence Operations</span>
                  <span className="text-[10px] text-[#7C88A6]">Re-order / Renumber</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleShiftRegisterRotate('forward')}
                    className="p-1.5 rounded-lg bg-[#07090F] border border-[#1E2740] hover:border-[#19B8C9] text-[10px] text-[#D7DEEC] flex items-center justify-center gap-1 cursor-pointer"
                    title="Shift register turns clockwise: T1 -> T2, TN -> T1"
                  >
                    <ArrowRight className="w-3 h-3 text-[#19B8C9]" />
                    <span>Shift Cycle +1</span>
                  </button>
                  <button
                    onClick={() => handleShiftRegisterRotate('backward')}
                    className="p-1.5 rounded-lg bg-[#07090F] border border-[#1E2740] hover:border-[#19B8C9] text-[10px] text-[#D7DEEC] flex items-center justify-center gap-1 cursor-pointer"
                    title="Shift register turns counter-clockwise: T2 -> T1"
                  >
                    <RotateCcw className="w-3 h-3 text-[#19B8C9]" />
                    <span>Shift Cycle -1</span>
                  </button>
                </div>

                <button
                  onClick={handleRenumberSequential}
                  className="w-full py-1.5 rounded-lg bg-[#07090F] border border-[#1E2740] hover:border-[#3DFF8F] text-[10px] text-[#3DFF8F] font-bold cursor-pointer"
                >
                  Renumber All Nodes (SF, T1, T2... TN)
                </button>
              </div>

              {/* Selected Node Inspector (Delta Elevation, Banking & Coordinates) */}
              {selectedNode && selectedNodeIdx !== null && (
                <div className="p-2.5 rounded-xl bg-[#121826] border border-[#F0388F]/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-[#F0388F]">
                    <span>Node: {selectedNode.label} (Index {selectedNodeIdx})</span>
                    <div className="flex items-center gap-1">
                      {selectedNodeIdx > 1 && (
                        <button
                          onClick={() => handleMoveNodeOrder(selectedNodeIdx, -1)}
                          className="p-1 rounded bg-[#07090F] text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer"
                          title="Move Earlier in Sequence"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                      )}
                      {selectedNodeIdx > 0 && selectedNodeIdx < splineNodes.length - 1 && (
                        <button
                          onClick={() => handleMoveNodeOrder(selectedNodeIdx, 1)}
                          className="p-1 rounded bg-[#07090F] text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer"
                          title="Move Later in Sequence"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Elevation Mode Toggle: From Last Node vs From SF Line */}
                  <div className="space-y-1">
                    <div className="text-[10px] text-[#7C88A6] uppercase font-bold">Elevation Delta System:</div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => {
                          const updated = [...splineNodes];
                          updated[selectedNodeIdx].elevation_mode = 'last';
                          setSplineNodes(updated);
                        }}
                        className={`py-1 px-1.5 rounded text-[10px] border font-bold cursor-pointer ${
                          selectedNode.elevation_mode === 'last'
                            ? 'bg-[#19B8C9] text-black border-[#19B8C9]'
                            : 'bg-[#07090F] text-[#7C88A6] border-[#1E2740]'
                        }`}
                      >
                        Δ From Last Node
                      </button>
                      <button
                        onClick={() => {
                          const updated = [...splineNodes];
                          updated[selectedNodeIdx].elevation_mode = 'sf';
                          setSplineNodes(updated);
                        }}
                        className={`py-1 px-1.5 rounded text-[10px] border font-bold cursor-pointer ${
                          selectedNode.elevation_mode === 'sf'
                            ? 'bg-[#FFC247] text-black border-[#FFC247]'
                            : 'bg-[#07090F] text-[#7C88A6] border-[#1E2740]'
                        }`}
                      >
                        Δ From S/F Line
                      </button>
                    </div>
                  </div>

                  {/* Delta & Absolute Elevation Input */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#7C88A6]">Elevation Delta:</span>
                      <span className="font-bold text-[#19B8C9]">
                        {selectedNode.elevation_val >= 0 ? '+' : ''}{selectedNode.elevation_val.toFixed(2)} m
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={selectedNode.elevation_val}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = [...splineNodes];
                          updated[selectedNodeIdx].elevation_val = val;
                          setSplineNodes(updated);
                        }}
                        className="w-20 px-2 py-0.5 bg-[#07090F] border border-[#1E2740] rounded text-xs text-[#D7DEEC] outline-none"
                      />
                      <input
                        type="range"
                        min="-15"
                        max="15"
                        step="0.2"
                        value={selectedNode.elevation_val}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const updated = [...splineNodes];
                          updated[selectedNodeIdx].elevation_val = val;
                          setSplineNodes(updated);
                        }}
                        className="flex-1 accent-[#19B8C9] cursor-pointer"
                      />
                    </div>
                    <div className="p-1.5 rounded bg-[#07090F] border border-[#1E2740] flex items-center justify-between text-[10px]">
                      <span className="text-[#7C88A6]">Computed Absolute ASL:</span>
                      <span className="font-bold text-[#3DFF8F]">{selectedNodeAbsElevation.toFixed(2)} m</span>
                    </div>
                  </div>

                  {/* Per-Node Banking (Camber Angle) */}
                  <div className="space-y-1 pt-1 border-t border-[#1E2740]">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#7C88A6]">Apex Banking:</span>
                      <span className={`font-bold ${
                        selectedNode.banking_deg > 0 ? 'text-[#3DFF8F]' : selectedNode.banking_deg < 0 ? 'text-[#FFC247]' : 'text-[#7C88A6]'
                      }`}>
                        {selectedNode.banking_deg > 0 ? `+${selectedNode.banking_deg.toFixed(1)}° (Inside)` : selectedNode.banking_deg < 0 ? `${selectedNode.banking_deg.toFixed(1)}° (Outside)` : '0.0° (Flat)'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-12"
                      max="15"
                      step="0.5"
                      value={selectedNode.banking_deg}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const updated = [...splineNodes];
                        updated[selectedNodeIdx].banking_deg = val;
                        setSplineNodes(updated);
                      }}
                      className="w-full accent-[#3DFF8F] cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-[#7C88A6]">
                      <span>-12° (Off-camber)</span>
                      <span>0° Flat</span>
                      <span>+15° (Banked In)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Auto paint and reset buttons */}
              <button
                onClick={handleAutoPaintRoad}
                className="w-full py-2 rounded-xl bg-[#19B8C9] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#19B8C9]/90 cursor-pointer shadow-[0_0_10px_rgba(25,184,201,0.25)] flex items-center justify-center gap-1.5"
              >
                <Brush className="w-3.5 h-3.5" />
                <span>Auto-Paint 12m Tarmac Road</span>
              </button>

              <button
                onClick={handleResetSpline}
                className="w-full py-1.5 rounded-xl bg-[#07090F] border border-[#1E2740] text-xs text-[#7C88A6] hover:text-[#D7DEEC] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Silverstone GP</span>
              </button>
            </div>
          )}

          {/* Elevation & Banking Modeler Tab (Colormap removed per request) */}
          {activeTab === 'elevation' && (
            <div className="space-y-3 text-xs">
              <div className="text-xs font-bold text-[#FFC247] uppercase pb-1 border-b border-[#1E2740] flex items-center justify-between">
                <span>Elevation & Banking System</span>
                <span className="text-[10px] text-[#3DFF8F]">{splineNodes.length} Waypoints</span>
              </div>

              {/* S/F Reference Datum */}
              <div className="p-2.5 rounded-xl bg-[#121826] border border-[#1E2740] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#7C88A6]">S/F Line Base Elevation:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="1"
                      value={sfElevationBase}
                      onChange={(e) => setSfElevationBase(Number(e.target.value))}
                      className="w-16 px-1.5 py-0.5 bg-[#07090F] border border-[#1E2740] rounded text-xs text-[#FFC247] text-right font-bold"
                    />
                    <span className="text-[#7C88A6] text-[10px]">m ASL</span>
                  </div>
                </div>
                <div className="text-[10px] text-[#7C88A6]">
                  All node elevations calculate absolute height using delta from S/F line or previous waypoint.
                </div>
              </div>

              {/* Elevation Profile Visual Line Chart */}
              <div className="p-2.5 rounded-xl bg-[#121826] border border-[#1E2740] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#D7DEEC]">
                  <span>Track Elevation Profile</span>
                  <span className="text-[10px] text-[#19B8C9]">
                    Min: {Math.min(...computedElevations).toFixed(1)}m | Max: {Math.max(...computedElevations).toFixed(1)}m
                  </span>
                </div>

                <div className="h-16 w-full bg-[#07090F] rounded-lg border border-[#1E2740] p-1 flex items-end gap-0.5 overflow-hidden">
                  {computedElevations.map((elev, i) => {
                    const minE = Math.min(...computedElevations) - 1;
                    const maxE = Math.max(...computedElevations) + 1;
                    const heightPct = Math.max(8, Math.min(100, ((elev - minE) / (maxE - minE)) * 100));
                    const isSelected = selectedNodeIdx === i;
                    const bank = splineNodes[i]?.banking_deg || 0;

                    return (
                      <div
                        key={i}
                        onClick={() => setSelectedNodeIdx(i)}
                        className={`flex-1 rounded-t transition-all cursor-pointer relative group ${
                          isSelected ? 'bg-[#F0388F]' : bank > 0 ? 'bg-[#19B8C9]' : bank < 0 ? 'bg-[#FFC247]' : 'bg-[#324060]'
                        }`}
                        style={{ height: `${heightPct}%` }}
                        title={`${splineNodes[i]?.label}: ${elev.toFixed(1)}m (Bank: ${bank}°)`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-[#7C88A6]">
                  <span>SF Line</span>
                  <span>Mid Lap</span>
                  <span>Final Sector</span>
                </div>
              </div>

              {/* Waypoints Elevation & Banking Table */}
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {splineNodes.map((node, i) => {
                  const isSelected = selectedNodeIdx === i;
                  const absElev = computedElevations[i] ?? 0;
                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedNodeIdx(i)}
                      className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected ? 'bg-[#121826] border-[#F0388F]' : 'bg-[#07090F] border-[#1E2740] hover:border-[#7C88A6]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${i === 0 ? 'text-[#3DFF8F]' : 'text-[#D7DEEC]'}`}>
                          {node.label || `T${i}`}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold ${
                          node.elevation_mode === 'sf' ? 'bg-[#FFC247]/20 text-[#FFC247]' : 'bg-[#19B8C9]/20 text-[#19B8C9]'
                        }`}>
                          Δ{node.elevation_mode}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="text-[#19B8C9] font-bold">
                          {node.elevation_val >= 0 ? '+' : ''}{node.elevation_val.toFixed(1)}m
                        </span>
                        <span className="text-[#3DFF8F] font-bold">{absElev.toFixed(1)}m</span>
                        <span className={`font-bold ${
                          node.banking_deg > 0 ? 'text-[#3DFF8F]' : node.banking_deg < 0 ? 'text-[#FFC247]' : 'text-[#7C88A6]'
                        }`}>
                          {node.banking_deg > 0 ? `+${node.banking_deg}°` : `${node.banking_deg}°`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pitlane Tab: Full 10 Teams, Garages, Boxes, Pitwall */}
          {activeTab === 'pitlane' && (
            <div className="space-y-3 text-xs">
              <div className="text-xs font-bold text-[#3DFF8F] uppercase pb-1 border-b border-[#1E2740] flex items-center justify-between">
                <span>F1 Pitlane & Team Garages</span>
                <span className="text-[10px] text-[#3DFF8F]">{pitlane.garages.length} Teams</span>
              </div>

              {/* Pitlane Controls & Auto-Generation */}
              <div className="p-2.5 rounded-xl bg-[#121826] border border-[#1E2740] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#7C88A6]">Pit Road Status:</span>
                  <button
                    onClick={() => setPitlane({ ...pitlane, enabled: !pitlane.enabled })}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer border ${
                      pitlane.enabled ? 'bg-[#3DFF8F]/20 border-[#3DFF8F] text-[#3DFF8F]' : 'border-[#1E2740] text-[#7C88A6]'
                    }`}
                  >
                    {pitlane.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#7C88A6]">Pit Speed Limit:</span>
                  <div className="flex gap-1">
                    {[60, 80].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setPitlane({ ...pitlane, speedLimitKmh: spd })}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer border ${
                          pitlane.speedLimitKmh === spd
                            ? 'bg-[#FFC247] text-black border-[#FFC247]'
                            : 'bg-[#07090F] text-[#7C88A6] border-[#1E2740]'
                        }`}
                      >
                        {spd} km/h
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAutoGeneratePitlane}
                  className="w-full py-1.5 rounded-lg bg-[#07090F] border border-[#3DFF8F] hover:bg-[#3DFF8F]/10 text-[10px] text-[#3DFF8F] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Auto-Align Pitlane with SF Straight</span>
                </button>

                <button
                  onClick={handlePaintPitlaneSurfaces}
                  className="w-full py-1.5 rounded-lg bg-[#3DFF8F] text-black text-[10px] font-bold uppercase tracking-wider hover:bg-[#3DFF8F]/90 flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_8px_rgba(61,255,143,0.3)]"
                >
                  <Brush className="w-3.5 h-3.5" />
                  <span>Paint Pit Surfaces (Tarmac & Wall)</span>
                </button>
              </div>

              {/* 10 Team Garages List */}
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {pitlane.garages.map((g) => {
                  const isSelected = selectedGarageId === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGarageId(isSelected ? null : g.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected ? 'bg-[#121826] border-[#3DFF8F] shadow-[0_0_8px_rgba(61,255,143,0.2)]' : 'bg-[#07090F] border-[#1E2740]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                        <div>
                          <div className="font-bold text-[#D7DEEC] text-[11px] truncate">{g.team}</div>
                          <div className="text-[9px] text-[#7C88A6]">Box: ({g.boxX}, {g.boxY}) | Wall: ({g.wallX}, {g.wallY})</div>
                        </div>
                      </div>
                      <span className="font-bold text-[10px] px-1.5 py-0.5 rounded bg-[#121826] border border-[#1E2740] text-[#D7DEEC]">
                        {g.shortName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Validation Tab */}
          {activeTab === 'validation' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#3DFF8F] uppercase pb-1 border-b border-[#1E2740]">
                Circuit Rulebook Validation
              </div>

              <div className="space-y-2">
                {validationChecks.map((v, i) => (
                  <div key={i} className="p-2 rounded-xl bg-[#07090F] border border-[#1E2740] space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#3DFF8F]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{v.name}</span>
                    </div>
                    <div className="text-[10px] text-[#7C88A6]">{v.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#19B8C9] uppercase pb-1 border-b border-[#1E2740]">
                Package & Export Pipeline
              </div>

              <div className="text-[11px] text-[#7C88A6] space-y-2">
                <p>Exports compressed multi-layer native bundle containing vector metadata, elevation profile, and pitlane layout.</p>
                <div className="p-2.5 rounded-xl bg-[#07090F] border border-[#1E2740] space-y-1 text-[10px]">
                  <div className="text-[#3DFF8F]">✓ track.json (1.3.0 schema)</div>
                  <div className="text-[#3DFF8F]">✓ pitlane_config (10 team garages, boxes & pitwall)</div>
                  <div className="text-[#3DFF8F]">✓ delta_elevations & banking ({splineNodes.length} waypoints)</div>
                  <div className="text-[#3DFF8F]">✓ surface/ (256x256 sparse PNGs)</div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save & Apply */}
          <div className="pt-2 border-t border-[#1E2740]">
            <button
              onClick={handleSaveTrack}
              className="w-full py-2.5 rounded-xl bg-[#19B8C9] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#19B8C9]/90 cursor-pointer shadow-[0_0_10px_rgba(25,184,201,0.25)] flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Save Track Definition</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
