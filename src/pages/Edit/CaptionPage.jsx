import React, { useState, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import VerticalCanvas from '../../components/crop/VerticalCanvas';
import CaptionEditor from '../../components/caption/CaptionEditor';
import CaptionPreview from '../../components/caption/CaptionPreview';
import QueuePageBase from '../../components/QueuePageBase';

const CaptionPage = () => {
  const {
    cropOverrides, // Get crop overrides to display the cropped video
    captionOverrides, setCaptionOverrides, // Use global caption state
  } = useAppContext();

  const [sharedCaptionData] = useState({}); // Default shared caption settings
  const [currentData, setCurrentData] = useState({}); // Current caption data being edited
  
  // Memoize the callback functions to prevent infinite re-renders
  const getItemData = useCallback(() => captionOverrides, [captionOverrides]);
  const getSharedData = useCallback(() => sharedCaptionData, [sharedCaptionData]);
  const handleDataChange = useCallback((data) => {
    console.log('📝 Caption data changed:', data);
  }, []);

  const renderCaptionEditor = ({ videoRef, videoSrc, videoSize, displayVideoSize, displayFrameSize, currentItem }) => {
    // Get the crop layers for the current clip to display the cropped output
    const currentCropLayers = currentItem ? (cropOverrides[currentItem.id] || []) : [];

    const handleCaptionChange = (newCaptionData) => {
      if (!currentItem) return;
      
      // Update the current data state (QueuePageBase will handle saving to overrides)
      setCurrentData(newCaptionData);
      
      // Trigger the data change callback
      handleDataChange(newCaptionData);
    };
    
    return (
      <div style={{ display: 'flex', gap: 40 }}>
        <div style={{ flex: 1 }}>
          {/* Caption Preview */}
          <CaptionPreview 
            captionData={currentData}
          />
          
          <CaptionEditor
            currentItem={currentItem}
            captionData={currentData}
            onCaptionChange={handleCaptionChange}
            videoRef={videoRef}
            videoSize={videoSize}
          />
          
          {/* Hidden video element to provide video source for VerticalCanvas */}
          {videoSrc && (
            <video
              ref={videoRef}
              src={videoSrc}
              width={displayVideoSize.width}
              height={displayVideoSize.height}
              controls
              style={{ 
                display: 'none' // Hidden but still provides video source for VerticalCanvas
              }}
            />
          )}
        </div>
        
        {/* Vertical video preview showing cropped output */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#666' }}>Cropped Video Output</h4>
          <VerticalCanvas
            canvasSize={videoSize}
            displaySize={displayFrameSize}
            layers={currentCropLayers}
            videoRef={videoRef}
            activeCrop={null}
            captionData={currentData}
          />
        </div>
      </div>
    );
  };

  return (
    <QueuePageBase
      pageType="caption"
      title="💬 Caption Editor"
      renderEditor={renderCaptionEditor}
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
