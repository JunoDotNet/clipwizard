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
  
  // Initialize crop data as empty - only load from .wizard files
  const [sharedCropLayers, setSharedCropLayersState] = useState([]);
  const [cropOverrides, setCropOverridesState] = useState({});

  // Initialize caption data as empty - only load from .wizard files
  const [captionOverrides, setCaptionOverridesState] = useState({});

  // Sharing state - persist across page switches
  const [brokenFromSharing, setBrokenFromSharingState] = useState(new Set());
  const [sharedGroups, setSharedGroupsState] = useState({});

  // Caption sharing state - separate from crop sharing
  const [captionBrokenFromSharing, setCaptionBrokenFromSharingState] = useState(new Set());
  const [captionSharedGroups, setCaptionSharedGroupsState] = useState({});

  // Output resolution system
  const [outputFormat, setOutputFormat] = useState('9:16');
  const [customResolution, setCustomResolution] = useState({ width: 1080, height: 1920 });

  // Window scale system
  const [windowScale, setWindowScale] = useState('medium');

  // Format presets
  const formatPresets = {
    '9:16': { name: 'Vertical (TikTok/Instagram)', width: 1080, height: 1920 },
    '16:9': { name: 'Horizontal (YouTube)', width: 1920, height: 1080 },
    '1:1': { name: 'Square (Instagram Post)', width: 1080, height: 1080 },
    '4:5': { name: 'Portrait (Instagram)', width: 1080, height: 1350 },
    'custom': { name: 'Custom', width: 1920, height: 1080 }
  };

  // Window scale presets (all maintain 4:3 aspect ratio)
  const windowScalePresets = {
    'small': { name: 'Small', width: 896, height: 672, description: '896×672', scale: 0.78 },
    'medium': { name: 'Medium', width: 1152, height: 864, description: '1152×864', scale: 1.0 },
    'large': { name: 'Large', width: 1408, height: 1056, description: '1408×1056', scale: 1.22 },
    'xlarge': { name: 'X-Large', width: 1664, height: 1248, description: '1664×1248', scale: 1.44 }
  };

  // Function to change window scale
  const changeWindowScale = async (newScale) => {
    if (window.electronAPI?.setWindowScale) {
      await window.electronAPI.setWindowScale(newScale);
      setWindowScale(newScale);
    }
  };

  // Get current output resolution
  const getOutputResolution = () => {
    if (outputFormat === 'custom') {
      return customResolution;
    }
    return formatPresets[outputFormat];
  };

  // Load sceneSegments from localStorage if available
  const [sceneSegments, setSceneSegmentsState] = useState(() => {
    try {
      const saved = localStorage.getItem('sceneSegments');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Only save sceneSegments to localStorage - crop data is saved in .wizard files
  useEffect(() => {
    try {
      localStorage.setItem('sceneSegments', JSON.stringify(sceneSegments));
    } catch {}
  }, [sceneSegments]);

  // Provide setters that update state
  const setSharedCropLayers = (layers) => {
    setSharedCropLayersState(layers);
  };

  const setCropOverrides = (overrides) => {
    setCropOverridesState(overrides);
  };

  const setCaptionOverrides = (overrides) => {
    setCaptionOverridesState(overrides);
  };

  const setSceneSegments = (segments) => {
    setSceneSegmentsState(segments);
  };

  const setBrokenFromSharing = (broken) => {
    setBrokenFromSharingState(broken);
  };

  const setSharedGroups = (groups) => {
    setSharedGroupsState(groups);
  };

  const setCaptionBrokenFromSharing = (broken) => {
    setCaptionBrokenFromSharingState(broken);
  };

  const setCaptionSharedGroups = (groups) => {
    setCaptionSharedGroupsState(groups);
  };

  // Function to clear crop data when loading a new video (not from .wizard file)
  const clearCropData = () => {
    setSharedCropLayersState([]);
    setCropOverridesState({});
    setCaptionOverridesState({});
    setBrokenFromSharingState(new Set());
    setSharedGroupsState({});
    setCaptionBrokenFromSharingState(new Set());
    setCaptionSharedGroupsState({});
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
        captionOverrides, setCaptionOverrides,
        sceneSegments, setSceneSegments,
        brokenFromSharing, setBrokenFromSharing,
        sharedGroups, setSharedGroups,
        captionBrokenFromSharing, setCaptionBrokenFromSharing,
        captionSharedGroups, setCaptionSharedGroups,
        clearCropData,
        // Output resolution system
        outputFormat, setOutputFormat,
        customResolution, setCustomResolution,
        formatPresets,
        getOutputResolution,
        // Window scale system
        windowScale, setWindowScale,
        windowScalePresets,
        changeWindowScale,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};


export const useAppContext = () => useContext(AppContext);
