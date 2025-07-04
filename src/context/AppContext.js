import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [videoSrc, setVideoSrc] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [clipTabs, setClipTabs] = useState([{ id: 'tab-1', name: 'Cut 1', clips: [] }]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [selectedFile, setSelectedFile] = useState(null);
  const [highlightedSections, setHighlightedSections] = useState([]);
  const [highlightLabels, setHighlightLabels] = useState([
    { id: 'label-1', name: 'Intro', color: '#ffcc00' },
  ]);
  const [wavPath, setWavPath] = useState(null); 
  const [showSplash, setShowSplash] = useState(true); 
  const [splashMode, setSplashMode] = useState('initial'); 

  const [cropQueue, setCropQueue] = useState([]);
  const [sharedCropLayers, setSharedCropLayers] = useState([]);
  const [cropOverrides, setCropOverrides] = useState({});
  // Load sceneSegments from localStorage if available
  const [sceneSegments, setSceneSegmentsState] = useState(() => {
    try {
      const saved = localStorage.getItem('sceneSegments');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save sceneSegments to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('sceneSegments', JSON.stringify(sceneSegments));
    } catch {}
  }, [sceneSegments]);

  // Provide a setter that updates state
  const setSceneSegments = (segments) => {
    setSceneSegmentsState(segments);
  };

  return (
    <AppContext.Provider
      value={{
        videoSrc, setVideoSrc,
        transcript, setTranscript,
        clipTabs, setClipTabs,
        activeTabId, setActiveTabId,
        selectedFile, setSelectedFile,
        highlightedSections, setHighlightedSections,
        highlightLabels, setHighlightLabels,
        wavPath, setWavPath, 
        showSplash, setShowSplash, 
        splashMode, setSplashMode, 
        cropQueue, setCropQueue,
        sharedCropLayers, setSharedCropLayers,
        cropOverrides, setCropOverrides,
        sceneSegments, setSceneSegments,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};


export const useAppContext = () => useContext(AppContext);
