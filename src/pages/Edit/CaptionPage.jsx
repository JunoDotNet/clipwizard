import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import OutputCanvas from '../../components/shared/OutputCanvas';
import CaptionLayerPanel from '../../components/caption/CaptionLayerPanel';
import QueueControls from '../../components/shared/QueueControls';
import { useQueueLogic } from '../../hooks/useQueueLogic';

const CaptionPage = () => {
  const videoRef = useRef(null);
  const {
    captionOverrides,
    setCaptionOverrides,
    cropOverrides,
    videoSrc,
    windowScale, windowScalePresets
  } = useAppContext();

  // Use the queue logic hook
  const queueLogic = useQueueLogic('caption');

  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [currentData, setCurrentData] = useState([]);   // caption layers for active clip
  const [hasInitialized, setHasInitialized] = useState(false); // Track if we've done initial load
  const [isUpdating, setIsUpdating] = useState(false);  // Prevent circular updates

  // Initialize currentData with first clip's caption data when component mounts (only once)
  React.useEffect(() => {
    if (queueLogic.cropQueue.length > 0 && !hasInitialized) {
      const firstClip = queueLogic.cropQueue[0];
      const firstClipData = captionOverrides[firstClip.id] || [];
      setCurrentData(JSON.parse(JSON.stringify(firstClipData)));
      setHasInitialized(true);
      console.log('🎯 Initialized caption page with first clip data:', firstClip.id, firstClipData);
    }
  }, [queueLogic.cropQueue, captionOverrides, hasInitialized]);

  // Update currentData when queue index changes (clip switching)
  React.useEffect(() => {
    if (queueLogic.currentItem && hasInitialized && !isUpdating) {
      const clipData = captionOverrides[queueLogic.currentItem.id] || [];
      const newData = JSON.parse(JSON.stringify(clipData));
      
      // Only update if the data is actually different
      if (JSON.stringify(newData) !== JSON.stringify(currentData)) {
        setCurrentData(newData);
        console.log('🔄 Switched to caption data:', queueLogic.currentItem.id, newData);
      }
    }
  }, [queueLogic.currentItem?.id, hasInitialized, captionOverrides, isUpdating]);

  // Save currentData changes to the current clip's override
  React.useEffect(() => {
    if (!queueLogic.currentItem || !hasInitialized || isUpdating) return;
    
    // Debounce the save to prevent excessive updates during drag operations
    const timeoutId = setTimeout(() => {
      setIsUpdating(true); // Prevent the switch effect from running
      
      const newOverrides = {
        ...captionOverrides,
        [queueLogic.currentItem.id]: JSON.parse(JSON.stringify(currentData))
      };
      
      setCaptionOverrides(newOverrides);
      console.log('💾 Saved caption data for:', queueLogic.currentItem.id);
      
      // Allow switch effect to run again after a brief delay
      setTimeout(() => setIsUpdating(false), 100);
    }, 200);
    
    return () => clearTimeout(timeoutId);
  }, [currentData]); // Only depend on currentData changes

  // Get duration from video ref
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const duration = video.duration;
      if (duration && !isNaN(duration)) {
        queueLogic.setVideoDuration(duration);
        console.log('⏱ Video duration:', duration.toFixed(2));
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [queueLogic.setVideoDuration]);

  const getItemData   = useCallback(() => captionOverrides, [captionOverrides]);
  const getSharedData = useCallback(() => ({}), []);
  const handleDataChange = useCallback((data) => {
    console.log('📝 Caption layers changed:', data);
  }, []);

  // Helper function to get transcription text for a clip based on its time range
  const getTranscriptionForClip = useCallback((clip) => {
    if (!queueLogic.transcript || !clip) return '';
    
    // Find transcript segments that overlap with the clip's time range
    const overlappingSegments = queueLogic.transcript.filter(segment => {
      const segmentStart = segment.start || 0;
      const segmentEnd = segment.end || segment.start || 0;
      const clipStart = clip.start || 0;
      const clipEnd = clip.end || clipStart;
      
      // Check if there's any overlap between segment and clip
      return segmentStart < clipEnd && segmentEnd > clipStart;
    });
    
    // Join the text from overlapping segments
    const transcriptionText = overlappingSegments
      .map(segment => segment.text || '')
      .join(' ')
      .trim();
      
    console.log(`🔍 Found transcription for ${clip.label}:`, transcriptionText);
    return transcriptionText;
  }, [queueLogic.transcript]);

  // Create a new caption layer with default properties and auto-filled text
  const createNewLayer = useCallback((box = null, text = '') => {
    // Auto-fill with transcription text if no text provided
    const autoText = text || getTranscriptionForClip(queueLogic.currentItem);
    
    return {
      id: `caption-${Date.now()}`,
      text: autoText, // Use transcription text automatically
      box: box || { x: 100, y: 100, width: 200, height: 50 },
      hidden: false,
      fontSize: 24,
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'left', // Default to left alignment (matches CaptionLayerPanel default)
      padding: 10
    };
  }, [queueLogic.currentItem, getTranscriptionForClip]);

  const renderCaptionEditor = useCallback(() => {
    const layers = Array.isArray(currentData) ? currentData : [];

    const handleUpdateLayers = useCallback((newLayers) => {
      setCurrentData(newLayers);
      handleDataChange(newLayers);
    }, [setCurrentData, handleDataChange]);

    const handleNewLayer = useCallback((layerData) => {
      // Debug: Log what we're receiving
      console.log('🐛 handleNewLayer called with:', layerData);
      const transcriptionText = getTranscriptionForClip(queueLogic.currentItem);
      console.log('🐛 Current item transcription:', transcriptionText);
      
      // If layerData is provided (from OutputCanvas drawing), use it directly
      // but ensure it has transcription text if no text is specified
      let newLayer;
      if (layerData) {
        newLayer = {
          ...layerData,
          text: layerData.text || transcriptionText
        };
      } else {
        newLayer = createNewLayer();
      }
      
      console.log('🐛 Final new layer:', newLayer);
      const newLayers = [...layers, newLayer];
      handleUpdateLayers(newLayers);
      console.log('➕ Added new caption layer:', newLayer);
    }, [layers, handleUpdateLayers, createNewLayer, queueLogic.currentItem, getTranscriptionForClip]);

    console.log('📝 CaptionPage currentData:', layers, 'type:', typeof layers, 'isArray:', Array.isArray(layers));

    // Create layers with preserved text - only use transcript text as fallback for empty layers
    const layersWithDynamicText = Array.isArray(layers) ? layers.map(layer => ({
      ...layer, // Keep all styling (font, color, position, size, etc.)
      text: layer.text || getTranscriptionForClip(queueLogic.currentItem) // Use transcription helper!
    })) : [];

    return (
      <div style={{ 
        display: 'flex', 
        gap: `var(--scaled-spacing-xl, 24px)`, 
        height: 'calc(100vh - 120px)', // Simple approach like CropPage
        alignItems: 'stretch'
      }}>
        {/* FIRST COLUMN: Queue Controls */}
        <div style={{ 
          width: `calc(300px * var(--app-scale, 1))`,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          height: `calc(500px * var(--app-scale, 1))`, // Taller than CropPage's 300px
          overflow: 'hidden',
          minHeight: 0
        }}>
          <QueueControls
            // Queue data
            cropQueue={queueLogic.cropQueue}
            queueIndex={queueLogic.queueIndex}
            setQueueIndex={queueLogic.setQueueIndex}
            currentItem={queueLogic.currentItem}
            
            // Playback controls
            isPlayingAll={queueLogic.isPlayingAll}
            playAllClips={() => queueLogic.playAllClips(videoRef)}
            stopPlayingAll={queueLogic.stopPlayingAll}
            currentPlayingIndex={queueLogic.currentPlayingIndex}
            jumpToClip={(item) => queueLogic.jumpToClip(item, videoRef)}
            videoRef={videoRef}
            
            // Copy/Paste functionality (if needed for captions)
            copiedData={queueLogic.copiedData}
            sourceClipLabel={queueLogic.sourceClipLabel}
            setCopiedData={queueLogic.setCopiedData}
            setSourceClipLabel={queueLogic.setSourceClipLabel}
            
            // Data management for captions
            getItemData={getItemData}
            getSharedData={getSharedData}
            setItemData={setCaptionOverrides}
            setCurrentData={setCurrentData}
            
            // Queue source controls
            queueSource={queueLogic.queueSource}
            setQueueSource={queueLogic.setQueueSource}
            clipTabs={queueLogic.clipTabs}
            handleSceneDetection={queueLogic.handleSceneDetection}
            
            // Page type for logging
            pageType="caption"
          />
        </div>

        {/* SECOND COLUMN: Output Canvas (Center) */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start', // Top align with queue
          flex: '1' // Take remaining space
        }}>
          <OutputCanvas
            videoRef={videoRef}
            displaySize={queueLogic.displayFrameSize}
            videoSize={queueLogic.videoSize}
            cropLayers={cropOverrides[queueLogic.currentItem?.id] || []}
            captionLayers={layersWithDynamicText}
            onNewLayer={handleNewLayer}
            onUpdateLayers={handleUpdateLayers}
            initialText={(() => {
              const currentItem = queueLogic.currentItem;
              console.log('🐛 Current item FULL OBJECT:', JSON.stringify(currentItem, null, 2));
              console.log('🐛 Current item keys:', currentItem ? Object.keys(currentItem) : 'NO ITEM');
              // Use the transcription helper function
              const text = getTranscriptionForClip(currentItem);
              console.log('🐛 Final transcription text:', text);
              return text;
            })()} 
            enableCaptionEditing={true}
          />
        </div>

        {/* THIRD COLUMN: Layer Panel */}
        <div style={{ 
          width: `calc(300px * var(--app-scale, 1))`,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start', // Top align with other columns
          alignItems: 'stretch'
        }}>
          <CaptionLayerPanel
            layers={layersWithDynamicText}
            onUpdateLayers={handleUpdateLayers}
            selectedLayerId={selectedLayerId}
            setSelectedLayerId={setSelectedLayerId}
          />
        </div>
      </div>
    );
  }, [currentData, queueLogic, selectedLayerId, setCurrentData, captionOverrides, getItemData, getSharedData, setCaptionOverrides, cropOverrides, windowScale, windowScalePresets]);

  return (
    <div style={{ padding: `var(--scaled-spacing-lg, 20px)` }}>
      <h2 style={{ 
        fontSize: `var(--scaled-font-lg, 18px)`,
        marginBottom: `var(--scaled-spacing-base, 12px)`
      }}>💬 Caption Editor</h2>
      
      {!queueLogic.videoSrc ? (
        <p style={{ color: '#999' }}>⚠️ No video loaded. Please import one first.</p>
      ) : (
        <>
          {/* Video element for playback */}
          <video
            ref={videoRef}
            src={queueLogic.videoSrc}
            style={{ display: 'none' }} // Hidden since we use canvases for display
            preload="metadata"
          />

          {/* Caption editor */}
          {renderCaptionEditor()}
        </>
      )}
    </div>
  );
};

export default CaptionPage;