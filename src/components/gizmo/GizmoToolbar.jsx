import React from 'react';

export default function GizmoToolbar({ mode, setMode, scaleLocked, setScaleLocked }) {
  const Item = ({ id, label }) => (
    <button
      onClick={() => setMode(id)}
      style={{
        width: 44, height: 44, border: '1px solid #444', background: mode === id ? '#2d8cff' : '#222',
        color: '#fff', borderRadius: 8, cursor: 'pointer'
      }}
      title={label}
    >{label}</button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Item id="move" label="↕" />
      <Item id="scale" label="⤡" />
      <Item id="rotate" label="⟳" />
      <button
        onClick={() => setScaleLocked(v => !v)}
        style={{
          width: 44, height: 44, border: '1px solid #444',
          background: scaleLocked ? '#2d8cff' : '#222', color: '#fff', borderRadius: 8
        }}
        title={scaleLocked ? 'Aspect locked' : 'Aspect unlocked'}
      >{scaleLocked ? '🔒' : '🔓'}</button>
    </div>
  );
}
