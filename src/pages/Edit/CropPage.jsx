import React, { useState, useCallback, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import VideoCanvas from '../../components/crop/VideoCanvas';
import OutputCanvas from '../../components/shared/OutputCanvas';
import QueuePageBase from '../../components/QueuePageBase';

const CropPage = () => {
  const {
    sharedCropLayers, setSharedCropLayers,
    cropOverrides, setCropOverrides,
    captionOverrides
  } = useAppContext();

  const [editingCrop, setEditingCrop] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [currentData, setCurrentData] = useState(null);

  // Memoize the callback functions to prevent infinite re-renders
  const getItemData = useCallback(() => cropOverrides, [cropOverrides]);
  const getSharedData = useCallback(() => sharedCropLayers, [sharedCropLayers]);
  const handleDataChange = useCallback((data) => {
    // This callback is triggered when layer data changes
    // The QueuePageBase will handle saving to overrides
    console.log('🎨 Crop data changed:', data);
  }, []);

  const renderCropEditor = ({ videoRef, videoSrc, videoSize, displayVideoSize, displayFrameSize, currentItem, currentData, setCurrentData }) => {
    const layers = currentData || [];

    return (
      <div style={{ display: 'flex', gap: 40 }}>
        <VideoCanvas
          videoPath={videoSrc}
          videoSize={videoSize}
          displaySize={displayVideoSize}
          videoRef={videoRef}
          layers={layers}
          setLayers={setCurrentData}
          editingCrop={editingCrop}
          setEditingCrop={setEditingCrop}
          editingIndex={editingIndex}
          setEditingIndex={setEditingIndex}
        />
        <OutputCanvas
          videoRef={videoRef}
          displaySize={displayFrameSize}
          videoSize={videoSize}
          cropLayers={layers}
          captionLayers={captionOverrides[currentItem?.id] || []}
          activeCrop={editingCrop}
          enableCaptionEditing={false}
          showResolutionSelector={true}
        />
      </div>
    );
  };

  return (
    <QueuePageBase
      pageType="crop"
      title="📐 Crop Editor"
      renderEditor={renderCropEditor}
      getItemData={getItemData}
      setItemData={setCropOverrides}
      getSharedData={getSharedData}
      setSharedData={setSharedCropLayers}
      currentData={currentData}
      setCurrentData={setCurrentData}
      onDataChange={handleDataChange}
    />
  );
};

export default CropPage;
