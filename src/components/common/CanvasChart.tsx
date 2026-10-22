import React, { useRef, useEffect } from 'react';

interface DataPoint {
  lap: number;
  value: number;
  lapType?: 'out' | 'push' | 'in';
  colour?: string;
}

interface CanvasChartProps {
  title: string;
  unit: string;
  data: DataPoint[];
  color?: string; // e.g. '#19B8C9'
  height?: number;
  referenceLine?: number;
  highlightMinMax?: boolean;
  colorByLapType?: boolean;
}

export const CanvasChart: React.FC<CanvasChartProps> = ({
  title,
  unit,
  data,
  color = '#19B8C9',
  height = 135,
  referenceLine,
  highlightMinMax = true,
  colorByLapType = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Clear background
    ctx.clearRect(0, 0, w, h);

    if (data.length === 0) {
      ctx.fillStyle = '#7C88A6';
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('Awaiting push lap data...', w / 2, h / 2);
      return;
    }

    const padding = { top: 18, right: 16, bottom: 22, left: 44 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Determine min/max
    const values = data.map((d) => d.value);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);

    if (referenceLine !== undefined) {
      minVal = Math.min(minVal, referenceLine);
      maxVal = Math.max(maxVal, referenceLine);
    }

    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    }

    const margin = (maxVal - minVal) * 0.1 || 1;
    minVal -= margin;
    maxVal += margin;

    const getY = (val: number) => {
      const norm = (val - minVal) / (maxVal - minVal);
      return padding.top + chartH * (1 - norm);
    };

    const getX = (index: number) => {
      if (data.length <= 1) return padding.left + chartW / 2;
      return padding.left + (index / (data.length - 1)) * chartW;
    };

    // Draw horizontal grid lines
    ctx.strokeStyle = '#1E2740';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const gy = padding.top + (chartH / 3) * i;
      ctx.moveTo(padding.left, gy);
      ctx.lineTo(w - padding.right, gy);

      // Y-axis label
      const labelVal = maxVal - ((maxVal - minVal) / 3) * i;
      ctx.fillStyle = '#7C88A6';
      ctx.font = '9px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(labelVal.toFixed(unit === 's' ? 2 : 1), padding.left - 6, gy + 3);
    }
    ctx.stroke();

    // Draw reference line if specified
    if (referenceLine !== undefined) {
      const refY = getY(referenceLine);
      ctx.strokeStyle = '#FFC247';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, refY);
      ctx.lineTo(w - padding.right, refY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#FFC247';
      ctx.font = '9px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText(`Ref: ${referenceLine.toFixed(2)}`, w - padding.right, refY - 4);
    }

    // Draw main line path
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((pt, i) => {
      const x = getX(i);
      const y = getY(pt.value);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw data points with lap type coloring if requested
    data.forEach((pt, i) => {
      const x = getX(i);
      const y = getY(pt.value);
      let ptColor = color;
      if (colorByLapType) {
        if (pt.lapType === 'push') ptColor = '#3DFF8F';
        else if (pt.lapType === 'out') ptColor = '#19B8C9';
        else if (pt.lapType === 'in') ptColor = '#FFC247';
      }

      ctx.fillStyle = ptColor;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Min / Max annotations
    if (highlightMinMax && data.length > 2) {
      const bestVal = Math.min(...values);
      const bestIndex = values.indexOf(bestVal);
      const bx = getX(bestIndex);
      const by = getY(bestVal);

      ctx.fillStyle = '#3DFF8F';
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3DFF8F';
      ctx.font = 'bold 9px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(`PB: ${bestVal.toFixed(2)}${unit}`, bx, by - 6);
    }

    // X-axis min and max laps
    ctx.fillStyle = '#7C88A6';
    ctx.font = '9px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(`L${data[0].lap}`, padding.left, h - 6);
    ctx.textAlign = 'right';
    ctx.fillText(`L${data[data.length - 1].lap}`, w - padding.right, h - 6);
  }, [data, color, referenceLine, highlightMinMax, colorByLapType, unit]);

  return (
    <div className="flex flex-col h-full bg-[#0D111A] border-2 border-[#1E2740] rounded-[14px] p-2.5 shadow-[0_0_12px_rgba(30,39,64,0.3)]">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-[11px] font-bold text-[#D7DEEC] uppercase tracking-wider">{title}</span>
        <span className="text-[10px] font-mono text-[#7C88A6]">
          {data.length > 0 ? `${data[data.length - 1].value.toFixed(unit === 's' ? 3 : 1)} ${unit}` : `— ${unit}`}
        </span>
      </div>
      <div className="flex-1 w-full min-h-[90px] relative">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
