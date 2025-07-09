import React from 'react';

const CaptionPreview = ({ 
  captionData = {}
}) => {
  const { text = '', fontSize = 24 } = captionData;

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
        color: '#333', // Dark text instead of white
        fontSize: Math.max(12, fontSize * 0.3), // Smaller scale for preview
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
        Preview
      </div>
    </div>
  );
};

export default CaptionPreview;
