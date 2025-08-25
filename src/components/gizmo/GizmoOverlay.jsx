import React, { useMemo } from 'react';

const HANDLE_SIZE = 10; // logical pixels

export default function GizmoOverlay({
  displaySize, canvasSize, scale,
  layers, selectedId, mode, scaleLocked,
  onPointerDown // (e, hit) => void
}) {
  // compute screen-space rects for the selected layer’s bbox for drawing handles
  const selected = layers.find(l => l.id === selectedId && !l.hidden);
  const handles = useMemo(() => {
    if (!selected) return [];
    const { crop, transform = { x:0,y:0,scaleX:1,scaleY:1,rotate:0 } } = selected;
    const w = crop.width  * transform.scaleX;
    const h = crop.height * transform.scaleY;
    // center in canvas-space
    const cx = canvasSize.width/2  + transform.x;
    const cy = canvasSize.height/2 + transform.y;
    // no rotation applied for rough bbox (for simplicity at first)
    const rect = {
      x: (cx - w/2) * scale,
      y: (cy - h/2) * scale,
      w: w * scale,
      h: h * scale
    };
    const s = HANDLE_SIZE;
    return [
      { id:'tl', x: rect.x - s/2,           y: rect.y - s/2 },
      { id:'tr', x: rect.x + rect.w - s/2,  y: rect.y - s/2 },
      { id:'br', x: rect.x + rect.w - s/2,  y: rect.y + rect.h - s/2 },
      { id:'bl', x: rect.x - s/2,           y: rect.y + rect.h - s/2 },
      { id:'tm', x: rect.x + rect.w/2 - s/2, y: rect.y - s/2 },
      { id:'bm', x: rect.x + rect.w/2 - s/2, y: rect.y + rect.h - s/2 },
      { id:'ml', x: rect.x - s/2,            y: rect.y + rect.h/2 - s/2 },
      { id:'mr', x: rect.x + rect.w - s/2,   y: rect.y + rect.h/2 - s/2 },
      // rotate handle above top-center
      { id:'rot', x: rect.x + rect.w/2 - s/2, y: rect.y - 24 - s/2, rotate: true }
    ].map(h => ({ ...h, w: s, h: s }));
  }, [selected, scale, canvasSize]);

  return (
    <div
      style={{
        position:'absolute', inset: 0, pointerEvents: 'none'
      }}
    >
      {/* selection rect */}
      {selected && (
        <div
          style={{
            position:'absolute',
            left: (canvasSize.width/2 + selected.transform.x - (selected.crop.width*selected.transform.scaleX)/2) * scale,
            top:  (canvasSize.height/2 + selected.transform.y - (selected.crop.height*selected.transform.scaleY)/2) * scale,
            width:  (selected.crop.width  * selected.transform.scaleX) * scale,
            height: (selected.crop.height * selected.transform.scaleY) * scale,
            border: '1px solid #2d8cff',
            outline: '2px solid rgba(45,140,255,0.3)',
            boxSizing:'border-box',
            pointerEvents:'none'
          }}
        />
      )}
      {/* handles */}
      {selected && handles.map(h => (
        <div
          key={h.id}
          onPointerDown={e => { e.stopPropagation(); onPointerDown?.(e, h); }}
          style={{
            position:'absolute',
            left: h.x, top: h.y, width: h.w, height: h.h,
            background: h.rotate ? '#ffb703' : '#2d8cff',
            border:'1px solid #111',
            borderRadius: 4,
            pointerEvents:'auto',
            cursor: h.rotate ? 'grab' :
                    (h.id==='ml'||h.id==='mr' ? 'ew-resize' :
                     (h.id==='tm'||h.id==='bm' ? 'ns-resize' : 'nwse-resize'))
          }}
          title={h.rotate ? 'Rotate' : (mode === 'scale' ? 'Scale' : 'Move')}
        />
      ))}
    </div>
  );
}
