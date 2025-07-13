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
            layers={Array.isArray(currentData) ? currentData : []}
            onNewLayer={handleNewLayer}
            onUpdateLayers={handleUpdateLayers}
          />
          <CaptionLayerPanel
            layers={Array.isArray(currentData) ? currentData : []}
            onUpdateLayers={handleUpdateLayers}
          />
        </div>
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
