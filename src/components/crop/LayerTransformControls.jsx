import React from 'react';

const LayerTransformControls = ({ transform, onChange }) => {
  // Provide safe defaults for all transform properties
  const safeTransform = {
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0,
    ...transform
  };

  return (
    <div style={{ marginTop: 8, paddingLeft: 10, fontSize: 13, display: 'flex', gap: 12 }}>
      <span>🧭 X: {safeTransform.x}px</span>
      <span>Y: {safeTransform.y}px</span>
      <span>🔍 Scale: {safeTransform.scale.toFixed(1)}×</span>
      <span>↻ Rotate: {safeTransform.rotate}°</span>
    </div>
  );
};

export default LayerTransformControls;
