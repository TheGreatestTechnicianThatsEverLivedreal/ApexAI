import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal, Lock } from 'lucide-react';

interface DraggableHUDOverlayProps {
  title: string;
  initialX: number;
  initialY: number;
  width?: number | string;
  lockedOn?: boolean;
  onClose?: () => void;
  accentColor?: string;
  borderColor?: string;
  children: React.ReactNode;
}

export const DraggableHUDOverlay: React.FC<DraggableHUDOverlayProps> = ({
  title,
  initialX,
  initialY,
  width = 240,
  lockedOn = false,
  onClose,
  accentColor = '#19B8C9',
  borderColor = '#19B8C9',
  children
}) => {
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag when clicking the header handle
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const maxX = Math.max(10, window.innerWidth - 220);
      const maxY = Math.max(10, window.innerHeight - 150);
      const nextX = Math.max(10, Math.min(maxX, e.clientX - dragOffsetRef.current.x));
      const nextY = Math.max(10, Math.min(maxY, e.clientY - dragOffsetRef.current.y));
      setPos({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: typeof width === 'number' ? `${width}px` : width
      }}
      className={`fixed z-50 rounded-xl bg-[#07090F]/95 backdrop-blur-md border border-[${borderColor}]/60 shadow-[0_0_24px_rgba(0,0,0,0.85)] flex flex-col pointer-events-auto transition-shadow ${
        isDragging ? 'shadow-[0_0_25px_rgba(25,184,201,0.4)] ring-1 ring-[#19B8C9]' : ''
      }`}
    >
      {/* Draggable Header Grip */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between px-3 py-2 border-b border-[#1E2740] select-none cursor-grab active:cursor-grabbing bg-[#0D111A]/80 rounded-t-xl hover:bg-[#121826]"
        title="Click and drag to reposition HUD window anywhere"
      >
        <div className="flex items-center gap-1.5" style={{ color: accentColor }}>
          <GripHorizontal className="w-3.5 h-3.5 text-[#7C88A6]" />
          <span className="text-[11px] font-bold uppercase tracking-wider">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          {lockedOn ? (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#3DFF8F]/20 text-[#3DFF8F] border border-[#3DFF8F]/40"
              title="Locked as ON in Model Builder"
            >
              <Lock className="w-2.5 h-2.5" />
              <span>LOCKED ON</span>
            </span>
          ) : (
            onClose && (
              <button
                onClick={onClose}
                className="text-[#7C88A6] hover:text-[#D7DEEC] p-0.5 rounded hover:bg-[#1E2740] cursor-pointer"
                title="Hide HUD"
              >
                ✕
              </button>
            )
          )}
        </div>
      </div>

      {/* HUD Body */}
      <div className="p-3 select-none">{children}</div>
    </div>
  );
};
