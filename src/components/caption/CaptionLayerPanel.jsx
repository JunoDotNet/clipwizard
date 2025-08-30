import React, { useState } from 'react';

const CaptionLayerPanel = ({ layers = [], onUpdateLayers }) => {
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(null);
  const [uploadedFonts, setUploadedFonts] = useState([]);

  const handleFontUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check if it's a font file
    const validExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      alert('Please upload a valid font file (.ttf, .otf, .woff, .woff2)');
      return;
    }

    try {
      // Create a URL for the font file
      const fontUrl = URL.createObjectURL(file);
      
      // Create a font face name (remove extension and sanitize)
      const fontName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '');
      const fontFamily = `Custom_${fontName}`;
      
      // Create and load the font
      const fontFace = new FontFace(fontFamily, `url(${fontUrl})`);
      await fontFace.load();
      
      // Add font to document
      document.fonts.add(fontFace);
      
      // Add to our uploaded fonts list
      const newFont = {
        name: file.name,
        family: fontFamily,
        url: fontUrl
      };
      
      setUploadedFonts(prev => [...prev, newFont]);
      
      // Clear the file input
      event.target.value = '';
      
      alert(`Font "${file.name}" uploaded successfully!`);
    } catch (error) {
      console.error('Failed to load font:', error);
      alert('Failed to load font. Please try a different font file.');
    }
  };

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
    <div style={{ display: 'flex'}}>
      {/* Main Layer Panel */}
      <div style={{ flex: 1, minWidth: '300px' }}>
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
                  <label
                    style={{ 
                      padding: '2px 6px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      border: 'none',
                      display: 'inline-block',
                      marginLeft: '8px',
                      float: 'right'
                    }}
                    title="Upload custom font"
                  >
                    📤 Upload
                    <input
                      type="file"
                      accept=".ttf,.otf,.woff,.woff2"
                      onChange={handleFontUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </label>
                <select
                  value={selectedLayer.fontFamily || 'Arial'}
                  onChange={(e) => handleLayerPropertyChange('fontFamily', e.target.value)}
                  style={{ width: '100%', padding: '2px' }}
                >
                  <optgroup label="System Fonts">
                    <option value="Arial">Arial</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                    <option value="Impact">Impact</option>
                    <option value="Comic Sans MS">Comic Sans MS</option>
                    <option value="Courier New">Courier New</option>
                    <option value="Trebuchet MS">Trebuchet MS</option>
                  </optgroup>
                  {uploadedFonts.length > 0 && (
                    <optgroup label="Uploaded Fonts">
                      {uploadedFonts.map((font, index) => (
                        <option key={index} value={font.family}>
                          {font.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <option value="custom">Custom Font (Type Name)</option>
                </select>
                
                {selectedLayer.fontFamily === 'custom' && (
                  <input
                    type="text"
                    placeholder="Enter custom font name (e.g., 'Roboto', 'Montserrat')"
                    value={selectedLayer.customFontName || ''}
                    onChange={(e) => handleLayerPropertyChange('customFontName', e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '4px', 
                      fontSize: '12px',
                      border: '1px solid #ccc',
                      borderRadius: '2px',
                      marginTop: '4px'
                    }}
                  />
                )}
              </div>
              
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '12px', fontWeight: 'bold' }}>
                  Text Alignment:
                </label>
                <select
                  value={selectedLayer.textAlign || 'left'}
                  onChange={(e) => handleLayerPropertyChange('textAlign', e.target.value)}
                  style={{ width: '100%', padding: '2px' }}
                >
                  <option value="left">⬅️ Left</option>
                  <option value="center">↔️ Center</option>
                  <option value="right">➡️ Right</option>
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
    </div>
  );
};

export default CaptionLayerPanel;