import React, { useState } from 'react';

const CaptionLayerPanel = ({ layers = [], onUpdateLayers }) => {
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(null);

  const handleToggleVisibility = (index) => {
    const updated = [...layers];
    updated[index].hidden = !updated[index].hidden;
    onUpdateLayers(updated);
  };

  const handleDelete = (index) => {
    const updated = layers.filter((_, i) => i !== index);
    onUpdateLayers(updated);
    // Reset selection if deleted layer was selected
    if (selectedLayerIndex === index) {
      setSelectedLayerIndex(null);
    } else if (selectedLayerIndex > index) {
      setSelectedLayerIndex(selectedLayerIndex - 1);
    }
  };

  const handleTextChange = (index, newText) => {
    const updated = [...layers];
    updated[index].text = newText;
    onUpdateLayers(updated);
  };

  const handleLayerPropertyChange = (property, value) => {
    if (selectedLayerIndex === null) return;
    const updated = [...layers];
    updated[selectedLayerIndex] = { ...updated[selectedLayerIndex], [property]: value };
    onUpdateLayers(updated);
  };

  const moveLayer = (from, to) => {
    if (to < 0 || to >= layers.length) return;
    const updated = [...layers];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onUpdateLayers(updated);
    
    // Update selection to follow the moved layer
    if (selectedLayerIndex === from) {
      setSelectedLayerIndex(to);
    } else if (selectedLayerIndex > from && selectedLayerIndex <= to) {
      setSelectedLayerIndex(selectedLayerIndex - 1);
    } else if (selectedLayerIndex < from && selectedLayerIndex >= to) {
      setSelectedLayerIndex(selectedLayerIndex + 1);
    }
  };

  const selectedLayer = selectedLayerIndex !== null ? layers[selectedLayerIndex] : null;

  return (
    <div style={{ marginTop: 16, minWidth: '300px' }}>
      <h4>🧱 Caption Layers</h4>
      
      {/* Layer Settings Panel */}
      <div style={{ 
        border: '2px solid #007bff', 
        padding: 12, 
        marginBottom: 16, 
        backgroundColor: '#f8f9fa',
        borderRadius: '4px'
      }}>
        <h5 style={{ margin: '0 0 8px 0' }}>⚙️ Layer Settings</h5>
        
        {selectedLayer ? (
          <>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>
                Text:
              </label>
              <textarea
                value={selectedLayer.text || ''}
                onChange={(e) => handleLayerPropertyChange('text', e.target.value)}
                style={{ 
                  width: '100%', 
                  minHeight: '60px', 
                  padding: '4px',
                  resize: 'vertical'
                }}
              />
            </div>
            
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>
                Text Color:
              </label>
              <input
                type="color"
                value={selectedLayer.color || '#ffffff'}
                onChange={(e) => handleLayerPropertyChange('color', e.target.value)}
                style={{ width: '100%', padding: '2px', height: '24px' }}
              />
            </div>
            
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>
                Font Family:
              </label>
              <select
                value={selectedLayer.fontFamily || 'Arial'}
                onChange={(e) => handleLayerPropertyChange('fontFamily', e.target.value)}
                style={{ width: '100%', padding: '2px' }}
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Helvetica">Helvetica</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
                <option value="Impact">Impact</option>
              </select>
            </div>
          </>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            color: '#666', 
            padding: '20px 0',
            fontStyle: 'italic'
          }}>
            Select a layer below to edit its settings
          </div>
        )}
      </div>
      
      {layers.length === 0 && <p style={{ color: '#999' }}>No layers yet.</p>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {layers.map((layer, index) => (
          <li
            key={layer.id}
            onClick={() => setSelectedLayerIndex(index)}
            style={{
              border: selectedLayerIndex === index ? '2px solid #007bff' : '1px solid #ccc',
              padding: 8,
              marginBottom: 6,
              backgroundColor: layer.hidden 
                ? '#f8d7da' 
                : selectedLayerIndex === index 
                  ? '#e3f2fd' 
                  : '#f0f0f0',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            <div style={{ marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>
              Layer {index + 1} {selectedLayerIndex === index && '(Selected)'}
            </div>
            <input
              type="text"
              value={layer.text}
              onChange={(e) => handleTextChange(index, e.target.value)}
              onClick={(e) => e.stopPropagation()} // Prevent layer selection when clicking input
              style={{ width: '60%' }}
            />
            <button 
              onClick={(e) => { e.stopPropagation(); handleToggleVisibility(index); }} 
              style={{ marginLeft: 8 }}
            >
              {layer.hidden ? '👁️ Show' : '🙈 Hide'}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleDelete(index); }} 
              style={{ marginLeft: 4, color: 'red' }}
            >
              🗑️ Delete
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); moveLayer(index, index - 1); }} 
              disabled={index === 0} 
              style={{ marginLeft: 4 }}
            >
              🔼 Up
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); moveLayer(index, index + 1); }} 
              disabled={index === layers.length - 1} 
              style={{ marginLeft: 4 }}
            >
              🔽 Down
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CaptionLayerPanel;