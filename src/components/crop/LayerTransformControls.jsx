import React from 'react';

const LayerTransformControls = ({ transform, onChange }) => {
  const update = (key, value) => {
    onChange({ ...transform, [key]: value });
  };

  return (
    <div style={{ marginTop: 8, paddingLeft: 10, fontSize: 13 }}>
      <div>
        <label>
          🧭 X:
          <input
            type="range"
            min={-500}
            max={500}
            step={1}
            value={transform.x}
            onChange={(e) => update('x', Number(e.target.value))}
          />
          <span> {transform.x}px</span>
        </label>
      </div>
      <div>
        <label>
          Y:
          <input
            type="range"
            min={-500}
            max={500}
            step={1}
            value={transform.y}
            onChange={(e) => update('y', Number(e.target.value))}
          />
          <span> {transform.y}px</span>
        </label>
      </div>
      <div>
        <label>
          🔍 Scale:
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.1}
            value={transform.scale}
            onChange={(e) => update('scale', Number(e.target.value))}
          />
          <span> {transform.scale.toFixed(1)}×</span>
        </label>
      </div>
      <div>
        <label>
          ↻ Rotate:
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={transform.rotate}
            onChange={(e) => update('rotate', Number(e.target.value))}
          />
          <span> {transform.rotate}°</span>
        </label>
      </div>
    </div>
  );
};

export default LayerTransformControls;
