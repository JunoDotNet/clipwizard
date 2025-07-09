import React, { useState, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import VideoCanvas from '../../components/crop/VideoCanvas';
import VerticalCanvas from '../../components/crop/VerticalCanvas';
import QueuePageBase from '../../components/QueuePageBase';

const CropPage = () => {
  const {
    sharedCropLayers, setSharedCropLayers,
    cropOverrides, setCropOverrides
  } = useAppContext();

  const [layers, setLayers] = useState([]);
  const [editingCrop, setEditingCrop] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  // Memoize the callback functions to prevent infinite re-renders
  const getItemData = useCallback(() => cropOverrides, [cropOverrides]);
  const getSharedData = useCallback(() => sharedCropLayers, [sharedCropLayers]);
  const handleDataChange = useCallback((data) => {
    // This callback is triggered when layer data changes
    // The QueuePageBase will handle saving to overrides
    console.log('🎨 Crop data changed:', data);
  }, []);

  const renderCropEditor = ({ videoRef, videoSrc, videoSize, displayVideoSize, displayFrameSize }) => (
    <div style={{ display: 'flex', gap: 40 }}>
      <VideoCanvas
        videoPath={videoSrc}
        videoSize={videoSize}
        displaySize={displayVideoSize}
        videoRef={videoRef}
        layers={layers}
        setLayers={setLayers}
        editingCrop={editingCrop}
        setEditingCrop={setEditingCrop}
        editingIndex={editingIndex}
        setEditingIndex={setEditingIndex}
      />
      <VerticalCanvas
        canvasSize={videoSize}
        displaySize={displayFrameSize}
        layers={layers}
        videoRef={videoRef}
        activeCrop={editingCrop}
      />
    </div>
  );

  return (
    <QueuePageBase
      pageType="crop"
      title="📐 Crop Editor"
      renderEditor={renderCropEditor}
      getItemData={getItemData}
      setItemData={setCropOverrides}
      getSharedData={getSharedData}
      setSharedData={setSharedCropLayers}
      currentData={layers}
      setCurrentData={setLayers}
      onDataChange={handleDataChange}
    />
  );
};

export default CropPage;
