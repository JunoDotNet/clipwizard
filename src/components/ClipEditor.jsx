import React from 'react';

const ClipEditor = ({ selectedClip, updateClipOffset }) => {
  if (!selectedClip) return null;

  return (
    <div style={{ marginTop: 20 }}>
      <h4>🎛️ Fine-Tune Clip</h4>
      <strong>{selectedClip.text}</strong>
      <div>
        <label>Start Offset:</label>
        <button onClick={() => updateClipOffset(selectedClip.id, 'startOffset', -0.1)}>-0.1s</button>
        <span style={{ margin: '0 5px' }}>{selectedClip.startOffset?.toFixed(1)}s</span>
        <button onClick={() => updateClipOffset(selectedClip.id, 'startOffset', 0.1)}>+0.1s</button>
      </div>
      <div>
        <label>End Offset:</label>
        <button onClick={() => updateClipOffset(selectedClip.id, 'endOffset', -0.1)}>-0.1s</button>
        <span style={{ margin: '0 5px' }}>{selectedClip.endOffset?.toFixed(1)}s</span>
        <button onClick={() => updateClipOffset(selectedClip.id, 'endOffset', 0.1)}>+0.1s</button>
      </div>
    </div>
  );
};

export default ClipEditor;
