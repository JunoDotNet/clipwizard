// pages/Edit/CropPage.jsx
import React, { useState, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import VideoCanvas from '../../components/crop/VideoCanvas';
import OutputCanvas from '../../components/shared/OutputCanvas';
import GizmoToolbar from '../../components/gizmo/GizmoToolbar';     // ✅ add
import QueuePageBase from '../../components/QueuePageBase';

const CropPage = () => {
  const {
    sharedCropLayers, setSharedCropLayers,
    cropOverrides, setCropOverrides,
    captionOverrides
  } = useAppContext();

  const [currentData, setCurrentData] = useState([]);   // crop layers for active clip
  const [selectedId, setSelectedId] = useState(null);   // which crop layer is selected
  const [gizmoMode, setGizmoMode] = useState('move');   // 'move' | 'scale' | 'rotate'
  const [scaleLocked, setScaleLocked] = useState(true); // keep aspect while scaling?

  const getItemData   = useCallback(() => cropOverrides, [cropOverrides]);
  const getSharedData = useCallback(() => sharedCropLayers, [sharedCropLayers]);
  const handleDataChange = useCallback((data) => {
    console.log('🎨 Crop data changed:', data);
  }, []);

  const renderCropEditor = ({ videoRef, videoSrc, videoSize, displayVideoSize, displayFrameSize, currentItem }) => {
    const layers = currentData || [];

    return (
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Left: source / draw crop boxes */}
        <VideoCanvas
          videoPath={videoSrc}
          videoSize={videoSize}
          displaySize={displayVideoSize}
          videoRef={videoRef}
          layers={layers}
          setLayers={setCurrentData}
          onSelect={(id) => setSelectedId(id)}
          selectedId={selectedId}
        />

        {/* Middle: rendered OUTPUT with gizmo overlay on top */}
        <div style={{ position: 'relative' }}>
          <OutputCanvas
            videoRef={videoRef}
            displaySize={displayFrameSize}
            videoSize={videoSize}
            cropLayers={layers}
            captionLayers={captionOverrides[currentItem?.id] || []}
            selectedLayerId={selectedId}                 // ✅ pass selection
            setSelectedLayerId={setSelectedId}
            gizmoMode={gizmoMode}                        // ✅ pass gizmo state
            setGizmoMode={setGizmoMode}                  // ✅ pass gizmo setter
            scaleLocked={scaleLocked}
            onChangeLayers={setCurrentData}              // ✅ live updates from overlay
            showResolutionSelector={true}
            enableCaptionEditing={false}
          />
        </div>

        {/* Right: vertical tool stack */}
        <GizmoToolbar
          mode={gizmoMode}
          setMode={setGizmoMode}
          scaleLocked={scaleLocked}
          setScaleLocked={setScaleLocked}
          onDelete={() => {
            if (!selectedId) return;
            setCurrentData(prev => prev.filter(l => l.id !== selectedId));
            setSelectedId(null);
          }}
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
