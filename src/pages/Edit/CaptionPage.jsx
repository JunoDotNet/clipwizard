import React, { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import QueuePageBase from '../../components/shared/QueuePageBase';
import OutputCanvas from '../../components/shared/OutputCanvas';
import CaptionLayerPanel from '../../components/caption/CaptionLayerPanel';

const CaptionPage = () => {
  const {
    captionOverrides,
    setCaptionOverrides,
    cropOverrides,
    cropQueue
  } = useAppContext();

  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [currentData, setCurrentData] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false); // Track if we've done initial load

  // Initialize currentData with first clip's caption data when component mounts (only once)
  useEffect(() => {
    if (cropQueue.length > 0 && !hasInitialized) {
      const firstClip = cropQueue[0];
      const firstClipData = captionOverrides[firstClip.id] || [];
      setCurrentData(JSON.parse(JSON.stringify(firstClipData)));
      setHasInitialized(true);
      console.log('🎯 Initialized caption page with first clip data:', firstClip.id, firstClipData);
    }
  }, [cropQueue, captionOverrides, hasInitialized]);

  // Access per-clip caption data
  const getItemData = useCallback(() => captionOverrides, [captionOverrides]);
  const getSharedData = useCallback(() => ({}), []); // Return empty object for shared data

  const handleDataChange = useCallback((data) => {
    console.log('📝 Caption layers changed:', data);
  }, []);

  // Create a new caption layer with default properties
  const createNewLayer = useCallback((box = null, text = '') => {
    return {
      id: `caption-${Date.now()}`,
      text: text || '',
      box: box || { x: 100, y: 100, width: 200, height: 50 },
      hidden: false,
      fontSize: 24,
      color: '#ffffff',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      fontFamily: 'Arial, sans-serif',
      textAlign: 'center',
      padding: 10
    };
  }, []);

  const renderEditor = ({ currentData, setCurrentData, currentItem, videoRef, videoSrc, displayFrameSize, videoSize }) => {
    const layers = Array.isArray(currentData) ? currentData : [];

    const handleUpdateLayers = useCallback((newLayers) => {
      setCurrentData(newLayers);
      handleDataChange(newLayers);
    }, [setCurrentData, handleDataChange]);

    const handleNewLayer = useCallback((layerData) => {
      // If layerData is provided (from OutputCanvas drawing), use it directly
      // Otherwise create a default layer
      const newLayer = layerData || createNewLayer();
      const newLayers = [...layers, newLayer];
      handleUpdateLayers(newLayers);
    }, [layers, handleUpdateLayers, createNewLayer]);

    console.log('📝 CaptionPage currentData:', layers, 'type:', typeof layers, 'isArray:', Array.isArray(layers));

    // Create layers with preserved text - only use transcript text as fallback for empty layers
    const layersWithDynamicText = Array.isArray(layers) ? layers.map(layer => ({
      ...layer, // Keep all styling (font, color, position, size, etc.)
      text: layer.text || (currentItem?.text || '').trim() // Use layer's text first, fallback to trimmed clip's text, then empty
    })) : [];

    return (
      <div style={{ display: 'flex', gap: 40 }}>
        <div>
          <h4>🖍 Draw Caption Boxes</h4>
          {/* Hidden video element to provide video data for crop rendering */}
          {videoSrc && (
            <video
              ref={videoRef}
              src={videoSrc}
              style={{ display: 'none' }}
              preload="metadata"
            />
          )}
          <OutputCanvas
            videoRef={videoRef}
            displaySize={displayFrameSize}
            videoSize={videoSize}
            cropLayers={cropOverrides[currentItem?.id] || []}
            captionLayers={layersWithDynamicText}
            onNewLayer={handleNewLayer}
            onUpdateLayers={handleUpdateLayers}
            initialText={(currentItem?.text || '').trim()} 
            enableCaptionEditing={true}
          />
        </div>
        <CaptionLayerPanel
          layers={layersWithDynamicText}
          onUpdateLayers={handleUpdateLayers}
          selectedLayerId={selectedLayerId}
          setSelectedLayerId={setSelectedLayerId}
        />
      </div>
    );
  };

  return (
    <QueuePageBase
      pageType="caption"
      title="💬 Caption Editor"
      renderEditor={renderEditor}
      getItemData={getItemData}
      setItemData={setCaptionOverrides}
      getSharedData={getSharedData}
      setSharedData={() => {}}
      currentData={currentData}
      setCurrentData={setCurrentData}
      onDataChange={handleDataChange}
    />
  );
};

export default CaptionPage;