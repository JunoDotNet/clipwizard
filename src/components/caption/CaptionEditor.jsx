import React, { useState, useEffect } from 'react';

const CaptionEditor = ({ 
  currentItem,
  captionData = {},
  onCaptionChange,
}) => {
  const [fontSize, setFontSize] = useState(captionData.fontSize || 24);
  const [captionText, setCaptionText] = useState(captionData.text || '');

  // Update local state when captionData changes (e.g., when switching clips)
  useEffect(() => {
    setFontSize(captionData.fontSize || 24);
    setCaptionText(captionData.text || '');
  }, [captionData]);

  const handleFontSizeChange = (newSize) => {
    setFontSize(newSize);
    onCaptionChange?.({ ...captionData, fontSize: newSize });
  };

  const handleTextChange = (newText) => {
    setCaptionText(newText);
    onCaptionChange?.({ ...captionData, text: newText });
  };

  return (
    <div style={{ padding: 16, border: '1px solid #333', borderRadius: 4, backgroundColor: '#f9f9f9' }}>
      <h4 style={{ margin: '0 0 16px 0' }}>📝 Caption Settings</h4>
      
      {/* Font Size Setting */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
          Font Size: {fontSize}px
        </label>
        <input
          type="range"
          min="12"
          max="72"
          value={fontSize}
          onChange={(e) => handleFontSizeChange(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Caption Text Input */}
      <div>
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
          Caption Text:
        </label>
        <textarea
          value={captionText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Enter your caption text here..."
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
