import React from 'react';

const CropLayerPanel = ({ 
  layers = [], 
  onUpdateLayers, 
  selectedLayerId, 
  setSelectedLayerId,
  currentItem 
}) => {
  const handleToggleVisibility = (layerId) => {
    const updated = layers.map(layer => 
      layer.id === layerId 
        ? { ...layer, hidden: !layer.hidden }
        : layer
    );
    onUpdateLayers(updated);
  };

  const handleDelete = (layerId) => {
    const updated = layers.filter(layer => layer.id !== layerId);
    onUpdateLayers(updated);
    // Clear selection if deleted layer was selected
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
  };

  const handleLayerClick = (layerId) => {
    setSelectedLayerId(selectedLayerId === layerId ? null : layerId);
  };

  return (
    <div style={{ 
      border: `var(--scaled-border-width, 2px) solid #4ecdc4`, 
      padding: `var(--scaled-spacing-base, 12px)`, 
      backgroundColor: '#f8f9fa',
      borderRadius: `var(--scaled-border-radius, 4px)`,
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h5 style={{ 
        margin: `0 0 var(--scaled-spacing-base, 12px) 0`, 
        color: '#4ecdc4', 
        fontSize: `var(--scaled-font-base, 14px)` 
      }}>
        🔲 Crop Layers {currentItem && `- ${currentItem.id}`}
      </h5>
      
      {layers.length === 0 ? (
        <p style={{ 
          color: '#999', 
          fontStyle: 'italic', 
          fontSize: `var(--scaled-font-sm, 12px)`,
          textAlign: 'center',
          padding: `var(--scaled-spacing-lg, 20px) 0`
        }}>
          No crop layers yet. Draw on the video to create one.
        </p>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {layers.map((layer, index) => (
              <li
                key={layer.id}
                onClick={() => handleLayerClick(layer.id)}
                style={{
                  border: selectedLayerId === layer.id 
                    ? `var(--scaled-border-width, 2px) solid #007bff` 
                    : `var(--scaled-border-width, 1px) solid #ccc`,
                  padding: `var(--scaled-spacing-sm, 8px)`,
                  marginBottom: `var(--scaled-spacing-xs, 6px)`,
                  backgroundColor: layer.hidden 
                    ? '#f8d7da' 
                    : selectedLayerId === layer.id 
                      ? '#e3f2fd' 
                      : '#fff',
                  cursor: 'pointer',
                  borderRadius: `var(--scaled-border-radius, 4px)`,
                  fontSize: `var(--scaled-font-sm, 12px)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: `var(--scaled-spacing-sm, 8px)` 
                }}>
                  <span style={{ fontWeight: 'bold' }}>
                    Layer {index + 1}
                  </span>
                  {selectedLayerId === layer.id && (
                    <span style={{ 
                      color: '#007bff', 
                      fontSize: `var(--scaled-font-xs, 10px)` 
                    }}>
                      (Selected)
                    </span>
                  )}
                  {layer.hidden && (
                    <span style={{ 
                      color: '#999', 
                      fontSize: `var(--scaled-font-xs, 10px)` 
                    }}>
                      (Hidden)
                    </span>
                  )}
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  gap: `var(--scaled-spacing-xs, 4px)` 
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleVisibility(layer.id);
                    }}
                    style={{
                      fontSize: `var(--scaled-font-xs, 10px)`,
                      padding: `var(--scaled-spacing-xs, 2px) var(--scaled-spacing-xs, 4px)`,
                      background: layer.hidden ? '#52c41a' : '#faad14',
                      color: 'white',
                      border: 'none',
                      borderRadius: `var(--scaled-border-radius, 2px)`,
                      cursor: 'pointer'
                    }}
                    title={layer.hidden ? 'Show layer' : 'Hide layer'}
                  >
                    {layer.hidden ? '👁️' : '🙈'}
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(layer.id);
                    }}
                    style={{
                      fontSize: `var(--scaled-font-xs, 10px)`,
                      padding: `var(--scaled-spacing-xs, 2px) var(--scaled-spacing-xs, 4px)`,
                      background: '#ff6b6b',
                      color: 'white',
                      border: 'none',
                      borderRadius: `var(--scaled-border-radius, 2px)`,
                      cursor: 'pointer'
                    }}
                    title="Delete layer"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {layers.length > 0 && (
        <div style={{ 
          marginTop: `var(--scaled-spacing-base, 12px)`, 
          padding: `var(--scaled-spacing-sm, 8px)`, 
          background: '#e8f8f5', 
          borderRadius: `var(--scaled-border-radius, 4px)`, 
          fontSize: `var(--scaled-font-xs, 10px)`, 
          color: '#666',
          flexShrink: 0
        }}>
          💡 Click a layer to select it, then use the gizmo tools to transform it.
        </div>
      )}
    </div>
  );
};

export default CropLayerPanel;
