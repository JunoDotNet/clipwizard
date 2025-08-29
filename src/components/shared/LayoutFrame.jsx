import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import SplashScreen from '../SplashScreen';

const LayoutFrame = ({ children }) => {
  const {
    showSplash, setShowSplash, splashMode, setSplashMode,
    selectedFile, transcript, clipTabs, activeTabId,
    highlightLabels, highlightedSections, wavPath,
    cropQueue, sharedCropLayers, cropOverrides, captionOverrides,
    windowScale, windowScalePresets, changeWindowScale,
  } = useAppContext();

  // Get the scale multiplier from current window scale
  const scaleMultiplier = windowScalePresets[windowScale]?.scale || 1.0;

  // Window control functions
  const handleMinimize = () => {
    if (window.electronAPI?.minimizeWindow) {
      window.electronAPI.minimizeWindow();
    }
  };

  const handleClose = () => {
    if (window.electronAPI?.closeWindow) {
      window.electronAPI.closeWindow();
    }
  };


  const handleSave = async () => {
    if (!selectedFile) return alert('❌ No file loaded.');
    const project = {
      videoFileName: selectedFile.name,
      videoFilePath: selectedFile.path,
      transcript,
      clipTabs,
      activeTabId,
      highlightLabels,
      highlightedSections,
      wavPath,
      cropQueue,
      sharedCropLayers,
      cropOverrides,
      captionOverrides,
    };
    const result = await window.electronAPI.saveProject(project);
    if (result) alert(`✅ Project saved to:\n${result}`);
  };

  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: `var(--scaled-spacing-base) var(--scaled-spacing-xl)`,
    background: '#222',
    color: '#ddd',
    fontFamily: 'sans-serif',
    gap: `var(--scaled-spacing-lg)`,
    height: `var(--scaled-header-height)`,
    fontSize: `var(--scaled-font-base)`,
    borderBottom: `var(--scaled-border-width) solid #333`,
    flexShrink: 0,
  };

  const navLinkStyle = ({ isActive }) => ({
    textDecoration: 'none',
    color: isActive ? '#fff' : '#aaa',
    fontWeight: isActive ? 'bold' : 'normal',
    fontSize: `var(--scaled-font-base)`,
  });

  // Add a handler for file selection to fix the error
  const handleFileSelected = (file, meta) => {
    // Example: just log and close splash, or set file in context if needed
    console.log('File selected:', file, meta);
    setShowSplash(false);
    // You can add more logic here to update context if needed
  };

  // Global CSS custom properties for consistent scaling
  const globalScaleStyle = {
    '--app-scale': scaleMultiplier,
    '--scaled-font-xs': `${10 * scaleMultiplier}px`,
    '--scaled-font-sm': `${12 * scaleMultiplier}px`, 
    '--scaled-font-base': `${14 * scaleMultiplier}px`,
    '--scaled-font-lg': `${16 * scaleMultiplier}px`,
    '--scaled-font-xl': `${18 * scaleMultiplier}px`,
    '--scaled-font-2xl': `${20 * scaleMultiplier}px`,
    '--scaled-spacing-xs': `${4 * scaleMultiplier}px`,
    '--scaled-spacing-sm': `${8 * scaleMultiplier}px`,
    '--scaled-spacing-base': `${12 * scaleMultiplier}px`,
    '--scaled-spacing-lg': `${16 * scaleMultiplier}px`,
    '--scaled-spacing-xl': `${20 * scaleMultiplier}px`,
    '--scaled-spacing-2xl': `${24 * scaleMultiplier}px`,
    '--scaled-button-height': `${32 * scaleMultiplier}px`,
    '--scaled-input-height': `${28 * scaleMultiplier}px`,
    '--scaled-header-height': `${60 * scaleMultiplier}px`,
    '--scaled-border-radius': `${4 * scaleMultiplier}px`,
    '--scaled-border-width': `${1 * scaleMultiplier}px`,
  };

  const containerStyle = {
    ...globalScaleStyle,
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    margin: 0,
    padding: 0,
    overflow: 'hidden',
    border: 'none',
    outline: 'none'
  };

  return (
    <div style={containerStyle}>
      {showSplash && (
        <SplashScreen
          splashMode={splashMode}
          onFileSelected={handleFileSelected}
          // The rest of the props can be passed from context or page as needed
        />
      )}
      <header style={baseStyle}>
        <NavLink to="/" style={navLinkStyle}>📥 Import</NavLink>
        <NavLink to="/edit" style={navLinkStyle}>✂️ Edit</NavLink>
        <NavLink to="/export" style={navLinkStyle}>📤 Export</NavLink>
        <div style={{ flex: 1 }} />
        
        {/* Window Scale Selector */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: `var(--scaled-spacing-sm)`, 
          marginRight: `var(--scaled-spacing-lg)` 
        }}>
          <label style={{ 
            fontSize: `var(--scaled-font-sm)`, 
            color: '#aaa' 
          }}>
            Window Size:
          </label>
          <select 
            value={windowScale}
            onChange={(e) => changeWindowScale(e.target.value)}
            style={{
              padding: `var(--scaled-spacing-xs) var(--scaled-spacing-sm)`,
              background: '#333',
              color: '#ddd',
              border: `var(--scaled-border-width) solid #555`,
              borderRadius: `var(--scaled-border-radius)`,
              fontSize: `var(--scaled-font-sm)`,
              height: `var(--scaled-input-height)`
            }}
          >
            {Object.entries(windowScalePresets).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.name} ({preset.description})
              </option>
            ))}
          </select>
        </div>
        
        <button 
          onClick={handleSave}
          style={{
            height: `var(--scaled-button-height)`,
            fontSize: `var(--scaled-font-base)`,
            padding: `0 var(--scaled-spacing-base)`,
            background: '#444',
            border: `var(--scaled-border-width) solid #555`,
            color: '#ddd',
            borderRadius: `var(--scaled-border-radius)`,
            cursor: 'pointer'
          }}
        >
          💾 Save Project
        </button>
        <button 
          onClick={() => { setSplashMode('manual'); setShowSplash(true); }} 
          title="Show Splash Screen" 
          style={{ 
            marginLeft: `var(--scaled-spacing-sm)`, 
            height: `var(--scaled-button-height)`,
            width: `var(--scaled-button-height)`,
            fontSize: `var(--scaled-font-lg)`,
            background: '#444',
            border: `var(--scaled-border-width) solid #555`,
            color: '#ddd',
            borderRadius: `var(--scaled-border-radius)`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          🧙
        </button>
        
        {/* Window controls inline */}
        <button
          onClick={handleMinimize}
          style={{
            marginLeft: `var(--scaled-spacing-sm)`,
            width: `var(--scaled-button-height)`,
            height: `var(--scaled-button-height)`,
            background: 'transparent',
            border: 'none',
            color: '#ddd',
            cursor: 'pointer',
            fontSize: `var(--scaled-font-lg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: `var(--scaled-border-radius)`
          }}
          onMouseEnter={(e) => e.target.style.background = '#444'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
          title="Minimize"
        >
          −
        </button>
        <button
          onClick={handleClose}
          style={{
            marginLeft: `var(--scaled-spacing-xs)`,
            width: `var(--scaled-button-height)`,
            height: `var(--scaled-button-height)`,
            background: 'transparent',
            border: 'none',
            color: '#ddd',
            cursor: 'pointer',
            fontSize: `var(--scaled-font-lg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: `var(--scaled-border-radius)`
          }}
          onMouseEnter={(e) => e.target.style.background = '#ff4444'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
          title="Close"
        >
          ×
        </button>
      </header>
      <main style={{ 
        flex: 1,
        overflow: 'hidden',
        minHeight: 0
      }}>
        {children}
      </main>
    </div>
  );
};

export default LayoutFrame;
