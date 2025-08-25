import React, { useState, useEffect } from 'react';
import FilePicker from './FilePicker';
import ProjectControls from './ProjectControls';

const AnimatedLoading = () => {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setDots(d => (d + 1) % 4), 500);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{
      position: 'absolute',
      left: 24,
      bottom: 18,
      fontSize: 18,
      color: '#888',
      letterSpacing: 1.5,
      fontFamily: 'monospace',
      userSelect: 'none',
      pointerEvents: 'none',
    }}>
      Loading{'.'.repeat(dots)}
    </div>
  );
};

const SplashScreen = ({ onFileSelected, onProjectLoaded, loading, setTranscript, setClipTabs, setActiveTabId, setSelectedFile, setVideoSrc, setWavUrl, splashMode }) => {
  const [selectedModel, setSelectedModel] = useState('ggml-medium.en.bin');
  const showClose = splashMode === 'manual';
  const { setShowSplash } = require('../context/AppContext').useAppContext();
  
  const handleFileSelectedWithModel = (url, file) => {
    onFileSelected(url, file, selectedModel);
  };
  
  // Handler for clicking outside the splash box
  const handleOverlayClick = () => {
    if (showClose) setShowSplash(false);
  };
  return (
    <>
      <div
        onClick={handleOverlayClick}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9998,
          background: 'rgba(255,255,255,0.01)',
          pointerEvents: 'auto',
        }}
      />
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 400,
          height: 400,
          background: 'white',
          color: '#222',
          borderRadius: 24,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        <h1 style={{ fontSize: 48, marginBottom: 32 }}>🎬 ClipWizard!</h1>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 'bold' }}>
            Whisper Model:
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            style={{
              width: '280px',
              padding: '8px 12px',
              fontSize: 14,
              border: '2px solid #ddd',
              borderRadius: 8,
              background: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="ggml-base.en.bin">Base Model (Faster, Less Accurate)</option>
            <option value="ggml-medium.en.bin">Medium Model (Slower, More Accurate)</option>
          </select>
        </div>

        <FilePicker onFileSelected={handleFileSelectedWithModel} />

        <div style={{ marginTop: 20 }}>
          <ProjectControls
            onLoadComplete={onProjectLoaded}
            setTranscript={setTranscript}
            setClipTabs={setClipTabs}
            setActiveTabId={setActiveTabId}
            setSelectedFile={setSelectedFile}
            setVideoSrc={setVideoSrc}
            setWavUrl={setWavUrl}
          />
        </div>

        {loading && <AnimatedLoading />}
      </div>
    </>
  );
};

export default SplashScreen;
