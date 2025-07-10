import React, { useState, useEffect } from 'react';

const CaptionEditor = ({ 
  currentItem,
  captionData = {},
  onCaptionChange,
  videoSize = { width: 1920, height: 1080 }
}) => {
  const [fontSize, setFontSize] = useState(captionData.fontSize || 24);
  const [fontFamily, setFontFamily] = useState(captionData.fontFamily || 'Arial');
  const [customFontPath, setCustomFontPath] = useState(captionData.customFontPath || '');
  const [fontColor, setFontColor] = useState(captionData.fontColor || '#ffffff');
  const [captionText, setCaptionText] = useState(captionData.text || '');

  // Update local state when captionData changes (e.g., when switching clips)
  useEffect(() => {
    setFontSize(captionData.fontSize || 24);
    setFontFamily(captionData.fontFamily || 'Arial');
    setCustomFontPath(captionData.customFontPath || '');
    setFontColor(captionData.fontColor || '#ffffff');
    
    // If no caption text is set, prefill with the clip's dialogue text
    const newCaptionText = captionData.text || currentItem?.text || '';
    setCaptionText(newCaptionText);
    
    // If we're auto-filling from dialogue and it's different from what was stored, 
    // update the caption data
    if (!captionData.text && currentItem?.text && newCaptionText !== captionData.text) {
      onCaptionChange?.({ ...captionData, text: newCaptionText });
    }
  }, [captionData, currentItem?.text, onCaptionChange]);

  const handleFontSizeChange = (newSize) => {
    setFontSize(newSize);
    onCaptionChange?.({ ...captionData, fontSize: newSize });
  };

  const handleFontColorChange = (newColor) => {
    setFontColor(newColor);
    onCaptionChange?.({ ...captionData, fontColor: newColor });
  };

  const handleFontFamilyChange = (newFontFamily) => {
    setFontFamily(newFontFamily);
    // Clear custom font when selecting built-in font
    if (newFontFamily !== 'custom') {
      setCustomFontPath('');
      onCaptionChange?.({ ...captionData, fontFamily: newFontFamily, customFontPath: '' });
    } else {
      onCaptionChange?.({ ...captionData, fontFamily: newFontFamily });
    }
  };

  const handleCustomFontSelect = async () => {
    try {
      const result = await window.electronAPI.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Font Files', extensions: ['ttf', 'otf', 'woff', 'woff2'] }
        ]
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        const fontPath = result.filePaths[0];
        setCustomFontPath(fontPath);
        onCaptionChange?.({ ...captionData, fontFamily: 'custom', customFontPath: fontPath });
      }
    } catch (error) {
      console.error('Error selecting font file:', error);
    }
  };

  const handleTextChange = (newText) => {
    setCaptionText(newText);
    onCaptionChange?.({ ...captionData, text: newText });
  };

  const handleAutoWrap = () => {
    // For caption display, we use the smaller dimension (width for horizontal, height for vertical)
    // This ensures text fits regardless of video orientation
    const videoWidth = Math.min(videoSize.width, videoSize.height);
    const maxWidth = videoWidth * 0.85; // 85% of video width for padding
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Use the same font settings as the caption
    const actualFont = fontFamily === 'custom' ? 'Arial' : fontFamily; // Fallback for measurement
    ctx.font = `bold ${fontSize}px ${actualFont}`;
    
    const words = captionText.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const width = ctx.measureText(testLine).width;
      
      if (width <= maxWidth && currentLine !== '') {
        currentLine = testLine;
      } else {
        if (currentLine !== '') {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    
    if (currentLine !== '') {
      lines.push(currentLine);
    }
    
    const wrappedText = lines.join('\n');
    setCaptionText(wrappedText);
    onCaptionChange?.({ ...captionData, text: wrappedText });
  };

  return (
    <div style={{ padding: 16, border: '1px solid #333', borderRadius: 4, backgroundColor: '#f9f9f9' }}>
      <h4 style={{ margin: '0 0 16px 0' }}>📝 Caption Settings</h4>
      
      {/* Font Size Setting */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
          Font Size (px):
        </label>
        <input
          type="number"
          min="12"
          max="72"
          value={fontSize}
          onChange={(e) => handleFontSizeChange(Number(e.target.value))}
          style={{
            width: '100%',
            padding: 8,
            border: '1px solid #ccc',
            borderRadius: 4,
            fontSize: 14
          }}
        />
      </div>

      {/* Font Color Setting */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
          Font Color:
        </label>
        <input
          type="color"
          value={fontColor}
          onChange={(e) => handleFontColorChange(e.target.value)}
          style={{
            width: '100%',
            height: 40,
            padding: 4,
            border: '1px solid #ccc',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        />
      </div>

      {/* Font Family Setting */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
          Font Family:
        </label>
        <select
          value={fontFamily}
          onChange={(e) => handleFontFamilyChange(e.target.value)}
          style={{
            width: '100%',
            padding: 8,
            border: '1px solid #ccc',
            borderRadius: 4,
            fontSize: 14,
            backgroundColor: 'white'
          }}
        >
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
          <option value="Trebuchet MS">Trebuchet MS</option>
          <option value="Courier New">Courier New</option>
          <option value="Impact">Impact</option>
          <option value="Comic Sans MS">Comic Sans MS</option>
          <option value="Tahoma">Tahoma</option>
          <option value="Palatino">Palatino</option>
          <option value="Garamond">Garamond</option>
          <option value="custom">Custom Font File...</option>
        </select>
      </div>

      {/* Custom Font File Picker */}
      {fontFamily === 'custom' && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
            Custom Font File:
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={customFontPath}
              placeholder="No font file selected"
              readOnly
              style={{
                flex: 1,
                padding: 8,
                border: '1px solid #ccc',
                borderRadius: 4,
                fontSize: 14,
                backgroundColor: '#f5f5f5'
              }}
            />
            <button
              onClick={handleCustomFontSelect}
              style={{
                padding: '8px 16px',
                border: '1px solid #007acc',
                borderRadius: 4,
                backgroundColor: '#007acc',
                color: 'white',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              Browse...
            </button>
          </div>
          {customFontPath && (
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {customFontPath.split('\\').pop() || customFontPath.split('/').pop()}
            </div>
          )}
        </div>
      )}

      {/* Caption Text Input */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ fontWeight: 'bold' }}>
            Caption Text:
          </label>
          <button
            onClick={handleAutoWrap}
            style={{
              padding: '4px 12px',
              border: '1px solid #007acc',
              borderRadius: 4,
              backgroundColor: '#007acc',
              color: 'white',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            🔄 Auto Wrap
          </button>
        </div>
        <textarea
          value={captionText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={currentItem?.text ? "Caption will auto-fill from dialogue. Edit as needed..." : "Enter your caption text here..."}
          style={{
            width: '100%',
            height: 120,
            padding: 8,
            border: '1px solid #ccc',
            borderRadius: 4,
            fontSize: 14,
            fontFamily: 'inherit',
            resize: 'vertical'
          }}
        />
      </div>
    </div>
  );
};

export default CaptionEditor;
