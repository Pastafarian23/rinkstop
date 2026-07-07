'use client';

import { useRef, useState, useEffect } from 'react';

interface Props {
  width?: number;
  height?: number;
  onChange: (svg: string | null, w: number, h: number) => void;
  disabled?: boolean;
}

/**
 * HTML5 canvas signature capture. Exports SVG markup of the captured
 * strokes. Self-contained — no external deps.
 *
 * Emits onChange whenever the user lifts the pen, passing the SVG (or null
 * if cleared) plus the canvas dimensions.
 */
export default function SignaturePad({ width = 480, height = 160, onChange, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const strokesRef = useRef<Array<Array<{ x: number; y: number }>>>([]);
  const currentStrokeRef = useRef<Array<{ x: number; y: number }> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // High-DPI canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#041E42';
    ctx.lineWidth = 2;
    // Initial blank fill (transparent — let background show through)
    ctx.clearRect(0, 0, width, height);
  }, [width, height]);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top),
    };
  }

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = '#041E42';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokesRef.current) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    currentStrokeRef.current = [getPos(e)];
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || !currentStrokeRef.current) return;
    currentStrokeRef.current.push(getPos(e));
    // Light incremental draw to keep latency low
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const stroke = currentStrokeRef.current;
    const last = stroke[stroke.length - 2];
    const cur = stroke[stroke.length - 1];
    ctx.strokeStyle = '#041E42';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(cur.x, cur.y);
    ctx.stroke();
  }

  function handlePointerUp() {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (currentStrokeRef.current && currentStrokeRef.current.length > 1) {
      strokesRef.current.push(currentStrokeRef.current);
      setHasInk(true);
      emit();
    } else {
      currentStrokeRef.current = null;
    }
  }

  function emit() {
    if (strokesRef.current.length === 0) {
      onChange(null, width, height);
      return;
    }
    // Build SVG markup. Each stroke is a polyline.
    const svgContent = strokesRef.current
      .map((stroke) => {
        const points = stroke.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        return `<polyline points="${points}" />`;
      })
      .join('');
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svgContent}</svg>`;
    onChange(svg, width, height);
  }

  function clear() {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setHasInk(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, width, height);
    }
    emit();
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          background: '#fafafa',
          border: `2px dashed ${hasInk ? '#041E42' : '#9ca3af'}`,
          borderRadius: 4,
          touchAction: 'none',
          cursor: disabled ? 'not-allowed' : 'crosshair',
          display: 'block',
          maxWidth: '100%',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: '0.8rem', color: '#6b7280' }}>
        <span>{hasInk ? 'Signed above' : 'Sign with mouse, finger, or stylus'}</span>
        <button
          type="button"
          onClick={clear}
          disabled={!hasInk || disabled}
          style={{ background: 'transparent', border: 'none', color: '#041E42', cursor: hasInk ? 'pointer' : 'not-allowed', fontSize: '0.85rem', textDecoration: 'underline' }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}