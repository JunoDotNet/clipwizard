import React, { createContext, useContext, useState } from 'react';

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
        wavPath, setWavPath, // ✅ NEW
        showSplash, setShowSplash, // <-- Add this
        splashMode, setSplashMode, // <-- Add this
        cropQueue, setCropQueue,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};


export const useAppContext = () => useContext(AppContext);
