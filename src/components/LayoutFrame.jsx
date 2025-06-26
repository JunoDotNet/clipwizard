import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const LayoutFrame = ({ children }) => {
  const {
    selectedFile, transcript, clipTabs, activeTabId,
    highlightLabels, highlightedSections
  } = useAppContext(); // add these two


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
      <header style={baseStyle}>
        <NavLink to="/" style={navLinkStyle}>📥 Import</NavLink>
        <NavLink to="/edit" style={navLinkStyle}>✂️ Edit</NavLink>
        <NavLink to="/export" style={navLinkStyle}>📤 Export</NavLink>
        <div style={{ flex: 1 }} />
        <button onClick={handleSave}>💾 Save Project</button>
      </header>
      <main>{children}</main>
    </div>
  );
};

export default LayoutFrame;
