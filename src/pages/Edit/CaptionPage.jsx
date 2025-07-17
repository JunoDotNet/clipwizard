import React, { useState, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import QueuePageBase from '../../components/QueuePageBase';
import CaptionDrawingCanvas from '../../components/caption/CaptionDrawingCanvas';
import CaptionLayerPanel from '../../components/caption/CaptionLayerPanel';

const CaptionPage = () => {
  const {
    captionOverrides,
    setCaptionOverrides,
    cropOverrides,
  } = useAppContext();

  const [currentData, setCurrentData] = useState([]); // Current caption layers for active clip
  const [sharedCaptionData] = useState({}); // Reserved for future shared settings
  const [selectedLayerId, setSelectedLayerId] = useState(null);


  // Access per-clip caption data
  const getItemData = useCallback(() => captionOverrides, [captionOverrides]);
  const getSharedData = useCallback(() => sharedCaptionData, [sharedCaptionData]);

  const handleDataChange = useCallback((data) => {
    console.log('📝 Caption layers changed:', data);
  }, []);

  const handleUpdateLayers = useCallback((updatedLayers) => {
    setCurrentData(updatedLayers);
    handleDataChange(updatedLayers);
  }, [handleDataChange]);

  const handleNewLayer = useCallback((newLayer) => {
    setCurrentData((prev) => {
      const prevArray = Array.isArray(prev) ? prev : [];
      const updated = [...prevArray, newLayer];
      handleDataChange(updated);
      return updated;
    });
  }, [handleDataChange]);


  const renderEditor = ({ currentItem, videoRef, videoSrc, displayFrameSize, videoSize }) => {
    console.log('📝 CaptionPage currentData:', currentData, 'type:', typeof currentData, 'isArray:', Array.isArray(currentData));

    // Create layers with dynamic text - preserve all styling but update text content
    const layersWithDynamicText = Array.isArray(currentData) ? currentData.map(layer => ({
      ...layer, // Keep all styling (font, color, position, size, etc.)
      text: currentItem?.text || layer.text || '' // Use clip's text, fallback to layer text, then empty
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
          <CaptionDrawingCanvas
            videoRef={videoRef}
            displaySize={displayFrameSize}
            videoSize={videoSize}
            cropLayers={cropOverrides[currentItem?.id] || []}
            layers={layersWithDynamicText}
            onNewLayer={handleNewLayer}
            onUpdateLayers={handleUpdateLayers}
            initialText={currentItem?.text || ''} 
            selectedLayerId={selectedLayerId}
            setSelectedLayerId={setSelectedLayerId}
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