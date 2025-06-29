import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import SplashScreen from '../components/SplashScreen';

const LayoutFrame = ({ children }) => {
  const {
    showSplash, setShowSplash, splashMode, setSplashMode,
    selectedFile, transcript, clipTabs, activeTabId,
    highlightLabels, highlightedSections, wavPath
  } = useAppContext();


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
    };
    const result = await window.electronAPI.saveProject(project);
    if (result) alert(`✅ Project saved to:\n${result}`);
  };

  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    background: '#222',
    color: '#ddd',
    fontFamily: 'sans-serif',
    gap: '20px',
  };

  const navLinkStyle = ({ isActive }) => ({
    textDecoration: 'none',
    color: isActive ? '#fff' : '#aaa',
    fontWeight: isActive ? 'bold' : 'normal',
    fontSize: 15,
  });

  return (
    <div>
      {showSplash && (
        <SplashScreen
          splashMode={splashMode}
          // The rest of the props can be passed from context or page as needed
        />
      )}
      <header style={baseStyle}>
        <NavLink to="/" style={navLinkStyle}>📥 Import</NavLink>
        <NavLink to="/edit" style={navLinkStyle}>✂️ Edit</NavLink>
        <NavLink to="/export" style={navLinkStyle}>📤 Export</NavLink>
        <div style={{ flex: 1 }} />
        <button onClick={handleSave}>💾 Save Project</button>
        <button onClick={() => { setSplashMode('manual'); setShowSplash(true); }} title="Show Splash Screen" style={{ marginLeft: 8, fontSize: 20 }}>🧙</button>
      </header>
      <main>{children}</main>
    </div>
  );
};

export default LayoutFrame;
