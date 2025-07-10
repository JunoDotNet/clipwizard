import React, { useState, useEffect } from 'react';

const CaptionPreview = ({ 
  captionData = {}
}) => {
  const { text = '', fontSize = 24, fontFamily = 'Arial', customFontPath, fontColor = '#ffffff' } = captionData;
  const [customFontLoaded, setCustomFontLoaded] = useState(false);
  const [customFontFamily, setCustomFontFamily] = useState('');

  // Load custom font when customFontPath changes
  useEffect(() => {
    if (fontFamily === 'custom' && customFontPath) {
      const loadCustomFont = async () => {
        try {
          // Create a unique font family name based on the file path
          const fontFileName = customFontPath.split('\\').pop() || customFontPath.split('/').pop();
          const fontName = `CustomFont_${fontFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')}`;
          
          // Read font file as base64 through Electron
          const result = await window.electronAPI.readFontFile(customFontPath);
          if (!result.success) {
            throw new Error(result.error);
          }
          
          // Determine font format based on file extension
          const extension = fontFileName.split('.').pop().toLowerCase();
          let format = 'truetype'; // default
          if (extension === 'otf') format = 'opentype';
          else if (extension === 'woff') format = 'woff';
          else if (extension === 'woff2') format = 'woff2';
          
          // Create font face with base64 data
          const fontFace = new FontFace(fontName, `url(data:font/${format};base64,${result.data})`);
          await fontFace.load();
          
          // Add to document fonts
          document.fonts.add(fontFace);
          
          setCustomFontFamily(fontName);
          setCustomFontLoaded(true);
        } catch (error) {
          console.warn('Could not load custom font for preview:', error);
          setCustomFontLoaded(false);
          setCustomFontFamily('');
        }
      };
      
      loadCustomFont();
    } else {
      setCustomFontLoaded(false);
      setCustomFontFamily('');
    }
  }, [fontFamily, customFontPath]);

  // Determine which font to use for preview
  const getPreviewFont = () => {
    if (fontFamily === 'custom') {
      if (customFontLoaded && customFontFamily) {
        return customFontFamily;
      } else {
        return 'Arial'; // Fallback while loading or if failed
      }
    }
    return fontFamily;
  };

  if (!text.trim()) {
    return (
      <div style={{ 
        width: '100%', 
        height: 60,
        backgroundColor: '#f5f5f5', 
        border: '1px solid #ddd',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: 14,
        marginBottom: 10
      }}>
        Caption preview will appear here
        {fontFamily === 'custom' && customFontPath && !customFontLoaded && (
          <span style={{ fontSize: 10, marginLeft: 8, color: '#666' }}>
            (Loading custom font...)
          </span>
        )}
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%', 
      height: 60, // Fixed height instead of minHeight
      backgroundColor: '#f5f5f5', // Same as empty state
      border: '1px solid #ddd', // Same as empty state
      borderRadius: 4,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
      position: 'relative',
      overflow: 'hidden', // Prevent text overflow
      boxSizing: 'border-box' // Include border in height calculation
    }}>
      {/* Caption text preview */}
      <div style={{
        color: fontColor, // Use selected color
        fontSize: Math.max(12, fontSize * 0.3), // Smaller scale for preview
        fontFamily: getPreviewFont(), // Use loaded custom font or fallback
        fontWeight: 'bold',
        textAlign: 'center',
        wordWrap: 'break-word',
        lineHeight: 1.2,
        maxWidth: '100%',
        overflow: 'hidden', // Prevent overflow
        textOverflow: 'ellipsis', // Show ... if text is too long
        whiteSpace: 'nowrap' // Keep text on single line to prevent expanding
      }}>
        {text}
      </div>
      
      {/* Preview label */}
      <div style={{
        position: 'absolute',
        top: 4,
        left: 4,
        color: '#999', // Lighter color to match the theme
        fontSize: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.7)', // Light background
        padding: '2px 4px',
        borderRadius: 2
      }}>
        Preview {fontFamily === 'custom' && customFontPath && !customFontLoaded && '(Loading...)'}
      </div>
    </div>
  );
};

export default CaptionPreview;
