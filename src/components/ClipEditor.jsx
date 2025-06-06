import React from 'react';

const ClipEditor = ({ clips, updateClipOffset }) => {
  return (
    <div style={{ marginTop: 20 }}>
      <h4>Fine-Tune Selected Clips</h4>
      {clips.map((clip) => (
        <div key={clip.id} style={{ marginBottom: 10 }}>
          <strong>{clip.text}</strong>
          <div>
            <label>Start Offset:</label>
            <button onClick={() => updateClipOffset(clip.id, 'startOffset', -0.1)}>-0.1s</button>
            <span style={{ margin: '0 5px' }}>{clip.startOffset?.toFixed(1)}s</span>
            <button onClick={() => updateClipOffset(clip.id, 'startOffset', 0.1)}>+0.1s</button>
          </div>
          <div>
            <label>End Offset:</label>
            <button onClick={() => updateClipOffset(clip.id, 'endOffset', -0.1)}>-0.1s</button>
            <span style={{ margin: '0 5px' }}>{clip.endOffset?.toFixed(1)}s</span>
            <button onClick={() => updateClipOffset(clip.id, 'endOffset', 0.1)}>+0.1s</button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ClipEditor;
