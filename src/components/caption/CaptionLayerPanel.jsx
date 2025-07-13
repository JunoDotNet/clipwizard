import React from 'react';

const CaptionLayerPanel = ({ layers = [], onUpdateLayers }) => {
  const handleToggleVisibility = (index) => {
    const updated = [...layers];
    updated[index].hidden = !updated[index].hidden;
    onUpdateLayers(updated);
  };

  const handleDelete = (index) => {
    const updated = layers.filter((_, i) => i !== index);
    onUpdateLayers(updated);
  };

  const handleTextChange = (index, newText) => {
    const updated = [...layers];
    updated[index].text = newText;
    onUpdateLayers(updated);
  };

  const moveLayer = (from, to) => {
    if (to < 0 || to >= layers.length) return;
    const updated = [...layers];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onUpdateLayers(updated);
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h4>🧱 Caption Layers</h4>
      {layers.length === 0 && <p style={{ color: '#999' }}>No layers yet.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {layers.map((layer, index) => (
          <li
            key={layer.id}
            style={{
              border: '1px solid #ccc',
              padding: 8,
              marginBottom: 6,
              backgroundColor: layer.hidden ? '#f8d7da' : '#f0f0f0',
            }}
          >
            <input
              type="text"
              value={layer.text}
              onChange={(e) => handleTextChange(index, e.target.value)}
              style={{ width: '60%' }}
            />
            <button onClick={() => handleToggleVisibility(index)} style={{ marginLeft: 8 }}>
              {layer.hidden ? '👁️ Show' : '🙈 Hide'}
            </button>
            <button onClick={() => handleDelete(index)} style={{ marginLeft: 4, color: 'red' }}>
              🗑️ Delete
            </button>
            <button onClick={() => moveLayer(index, index - 1)} disabled={index === 0} style={{ marginLeft: 4 }}>
              🔼 Up
            </button>
            <button onClick={() => moveLayer(index, index + 1)} disabled={index === layers.length - 1} style={{ marginLeft: 4 }}>
              🔽 Down
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CaptionLayerPanel;