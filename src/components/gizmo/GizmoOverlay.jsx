import React, { useMemo } from 'react';

const HANDLE_SIZE = 10; // logical pixels

export default function GizmoOverlay({
  displaySize,          // { width, height } (not required for math here, but fine to keep)
  canvasSize,           // { width, height }
  scale,                // CSS px per canvas px
  layers,
  selectedId,
  mode,
  scaleLocked,
  onPointerDown         // (e, handle) => void  (Phase 2+ will use this)
}) {
  const selected = useMemo(() => {
    return layers.find(l => l.id === selectedId && !l.hidden) || null;
  }, [layers, selectedId]);

  const handles = useMemo(() => {
    if (!selected || !canvasSize) return [];

    const crop = selected.crop || { x:0, y:0, width:0, height:0 };
    const t = selected.transform || {};

    const sx = t.scaleX ?? t.scale ?? 1;
    const sy = t.scaleY ?? t.scale ?? 1;
    const tx = t.x ?? 0;
    const ty = t.y ?? 0;

    const w = crop.width  * sx;
    const h = crop.height * sy;

    // center in canvas-space
    const cx = canvasSize.width  / 2 + tx;
    const cy = canvasSize.height / 2 + ty;

    // axis-aligned bbox (ignores rotation for Phase 1 visual scaffolding)
    const rect = {
      x: (cx - w / 2) * scale,
      y: (cy - h / 2) * scale,
      w:  w * scale,
      h:  h * scale,
    };

    const s = HANDLE_SIZE;
    const list = [
      { id:'tl', x: rect.x - s/2,           y: rect.y - s/2 },
      { id:'tr', x: rect.x + rect.w - s/2,  y: rect.y - s/2 },
      { id:'br', x: rect.x + rect.w - s/2,  y: rect.y + rect.h - s/2 },
      { id:'bl', x: rect.x - s/2,           y: rect.y + rect.h - s/2 },
      { id:'tm', x: rect.x + rect.w/2 - s/2, y: rect.y - s/2 },
      { id:'bm', x: rect.x + rect.w/2 - s/2, y: rect.y + rect.h - s/2 },
      { id:'ml', x: rect.x - s/2,            y: rect.y + rect.h/2 - s/2 },
      { id:'mr', x: rect.x + rect.w - s/2,   y: rect.y + rect.h/2 - s/2 },
      // rotate handle above top-center
      { id:'rot', x: rect.x + rect.w/2 - s/2, y: rect.y - 24 - s/2, rotate: true },
    ];

    return list.map(h => ({ ...h, w: s, h: s }));
  }, [selected, canvasSize, scale]);

  // Uniform scale helpers for the selection rect
  const rectStyle = useMemo(() => {
    if (!selected || !canvasSize) return null;

    const crop = selected.crop || { width:0, height:0 };
    const t = selected.transform || {};
    const s = t.scale ?? 1;  // uniform scale is what your renderer uses
    const tx = t.x ?? 0;
    const ty = t.y ?? 0;

    const left   = (canvasSize.width  / 2 + tx - (crop.width  * s) / 2) * scale;
    const top    = (canvasSize.height / 2 + ty - (crop.height * s) / 2) * scale;
    const width  = (crop.width  * s) * scale;
    const height = (crop.height * s) * scale;

    return {
      position: 'absolute',
      left, top, width, height,
      border: '1px solid #2d8cff',
      outline: '2px solid rgba(45,140,255,0.3)',
      boxSizing: 'border-box',
      pointerEvents: 'none',
    };
  }, [selected, canvasSize, scale]);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Selection rect */}
      {selected && rectStyle && <div style={rectStyle} />}

      {/* Handles */}
      {selected && handles.map(h => (
        <div
          key={h.id}
          onPointerDown={e => { e.stopPropagation(); onPointerDown?.(e, h); }}
          style={{
            position: 'absolute',
            left: h.x, top: h.y, width: h.w, height: h.h,
            background: h.rotate ? '#ffb703' : '#2d8cff',
            border: '1px solid #111',
            borderRadius: 4,
            pointerEvents: 'auto',
            cursor: h.rotate
              ? 'grab'
              : (h.id === 'ml' || h.id === 'mr')
              ? 'ew-resize'
              : (h.id === 'tm' || h.id === 'bm')
              ? 'ns-resize'
              : 'nwse-resize'
          }}
          title={h.rotate ? 'Rotate' : (mode === 'scale' ? 'Scale' : 'Move')}
        />
      ))}
    </div>
  );
}
