// pages/Edit/CropPage.jsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import VideoCanvas from '../../components/crop/VideoCanvas';
import OutputCanvas from '../../components/shared/OutputCanvas';
import GizmoToolbar from '../../components/gizmo/GizmoToolbar';
import QueueControls from '../../components/shared/QueueControls';
import CropLayerPanel from '../../components/crop/CropLayerPanel';
import { useQueueLogic } from '../../hooks/useQueueLogic';

const CropPage = () => {
  const videoRef = useRef(null);
  const {
    sharedCropLayers, setSharedCropLayers,
    cropOverrides, setCropOverrides,
    captionOverrides,
    videoSrc,
    sharingGroups, setSharingGroups,
    getOutputResolution,
    windowScale, windowScalePresets  // Add windowScale from context
  } = useAppContext();

  // Use the queue logic hook
  const queueLogic = useQueueLogic('crop');

  const [currentData, setCurrentData] = useState([]);   // crop layers for active clip
  const [selectedId, setSelectedId] = useState(null);   // which crop layer is selected
  const [gizmoMode, setGizmoMode] = useState('move');   // 'move' | 'scale' | 'rotate'
  const [scaleLocked, setScaleLocked] = useState(true); // keep aspect while scaling?
  const [hasInitialized, setHasInitialized] = useState(false); // Track if we've done initial load
  const [isUpdating, setIsUpdating] = useState(false);  // Prevent circular updates

  // Initialize currentData with first clip's crop data when component mounts (only once)
  React.useEffect(() => {
    if (queueLogic.cropQueue.length > 0 && !hasInitialized) {
      const firstClip = queueLogic.cropQueue[0];
      const firstClipData = cropOverrides[firstClip.id] || [...sharedCropLayers];
      setCurrentData(JSON.parse(JSON.stringify(firstClipData)));
      setHasInitialized(true);
      
      // Auto-create sharing groups for clips with identical timing (natural sharing)
      const naturalGroups = {};
      let groupNum = 1;
      
      queueLogic.cropQueue.forEach(clip => {
        // Skip if already broken from sharing
        if (queueLogic.activeBrokenFromSharing?.has(clip.id)) return;
        
        // Find other clips with same timing that aren't broken
        const sameTimeClips = queueLogic.cropQueue.filter(c => 
          c.start === clip.start && 
          c.end === clip.end &&
          !queueLogic.activeBrokenFromSharing?.has(c.id)
        );
        
        // If more than one clip has this timing, create a group
        if (sameTimeClips.length > 1) {
          const timingKey = `${clip.start}-${clip.end}`;
          if (!naturalGroups[timingKey]) {
            naturalGroups[timingKey] = {
              id: `natural-${groupNum++}`,
              clips: sameTimeClips.map(c => c.id)
            };
          }
        }
      });
      
      // Convert to sharing groups format
      const newSharingGroups = {};
      Object.values(naturalGroups).forEach(group => {
        newSharingGroups[group.id] = group.clips;
      });
      
      if (Object.keys(newSharingGroups).length > 0) {
        setSharingGroups(newSharingGroups);
        console.log('🔗 Created natural sharing groups:', newSharingGroups);
      }
      
      console.log('🎯 Initialized crop page with first clip data:', firstClip.id, firstClipData);
    }
  }, [queueLogic.cropQueue, cropOverrides, sharedCropLayers, hasInitialized, queueLogic.activeBrokenFromSharing]);

  // Update currentData when queue index changes (clip switching)
  React.useEffect(() => {
    if (queueLogic.currentItem && hasInitialized && !isUpdating) {
      const clipData = cropOverrides[queueLogic.currentItem.id] || [...sharedCropLayers];
      const newData = JSON.parse(JSON.stringify(clipData));
      
      // Only update if the data is actually different
      if (JSON.stringify(newData) !== JSON.stringify(currentData)) {
        setCurrentData(newData);
        console.log('🔄 Switched to clip data:', queueLogic.currentItem.id, newData);
      }
    }
  }, [queueLogic.currentItem?.id, hasInitialized, cropOverrides, sharedCropLayers, isUpdating]);

  // Save currentData changes to the current clip's override
  React.useEffect(() => {
    if (!queueLogic.currentItem || !hasInitialized || isUpdating) return;
    
    // Debounce the save to prevent excessive updates during drag operations
    const timeoutId = setTimeout(() => {
      setIsUpdating(true); // Prevent the switch effect from running
      
      const newOverrides = {
        ...cropOverrides,
        [queueLogic.currentItem.id]: JSON.parse(JSON.stringify(currentData))
      };
      
      // Check if in a sharing group first
      let propagated = false;
      for (const [groupId, clipIds] of Object.entries(sharingGroups || {})) {
        if (clipIds.includes(queueLogic.currentItem.id)) {
          // Propagate to all clips in the sharing group
          clipIds.forEach(clipId => {
            if (clipId !== queueLogic.currentItem.id) {
              newOverrides[clipId] = JSON.parse(JSON.stringify(currentData));
            }
          });
          console.log(`🔗 Propagated to sharing group (${clipIds.length - 1} other clips)`);
          propagated = true;
          break;
        }
      }
      
      // If not in sharing group, don't propagate anywhere
      // (Natural sharing is now handled by explicit sharing groups only)
      
      setCropOverrides(newOverrides);
      console.log('💾 Saved crop data for:', queueLogic.currentItem.id);
      
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

  const getItemData   = useCallback(() => cropOverrides, [cropOverrides]);
  const getSharedData = useCallback(() => sharedCropLayers, [sharedCropLayers]);
  const handleDataChange = useCallback((data) => {
    console.log('🎨 Crop data changed:', data);
  }, []);

  const renderCropEditor = useCallback(() => {
    const layers = currentData || [];

    return (
      <div style={{ 
        display: 'flex', 
        gap: `var(--scaled-spacing-xl, 24px)`, 
        height: 'calc(100vh - 120px)', // Full height minus header and padding
        alignItems: 'stretch'
      }}>
        {/* LEFT COLUMN: VideoCanvas and controls */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: `var(--scaled-spacing-base, 16px)`,
          width: 'calc(600px * var(--app-scale, 1))', // Match VideoCanvas width exactly
          flexShrink: 0, // Don't allow shrinking
          minWidth: 0 // Allow content to shrink if needed
        }}>
          {/* Video canvas for drawing crop boxes */}
          <VideoCanvas
            videoPath={queueLogic.videoSrc}
            videoSize={queueLogic.videoSize}
            displaySize={queueLogic.displayVideoSize}
            videoRef={videoRef}
            layers={layers}
            setLayers={setCurrentData}
            onSelect={(id) => setSelectedId(id)}
            selectedId={selectedId}
          />
          
          {/* Queue controls and layer panel - constrained height with scaling */}
          <div style={{ 
            display: 'flex', 
            gap: `var(--scaled-spacing-base, 16px)`,
            height: `calc(300px * var(--app-scale, 1))`, // Scale with app context
            minHeight: 0 // Allow shrinking
          }}>
            {/* Queue controls - 2/3 width */}
            <div style={{ 
              flex: '2',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0, // Allow shrinking
              height: '100%' // Fill container height
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
                
                // Copy/Paste functionality
                copiedData={queueLogic.copiedData}
                sourceClipLabel={queueLogic.sourceClipLabel}
                setCopiedData={queueLogic.setCopiedData}
                setSourceClipLabel={queueLogic.setSourceClipLabel}
                
                // Data management
                getItemData={getItemData}
                getSharedData={getSharedData}
                setItemData={setCropOverrides}
                setCurrentData={setCurrentData}
                
                // Queue source controls (now in header)
                queueSource={queueLogic.queueSource}
                setQueueSource={queueLogic.setQueueSource}
                clipTabs={queueLogic.clipTabs}
                handleSceneDetection={queueLogic.handleSceneDetection}
                
                // Sharing functionality
                activeBrokenFromSharing={queueLogic.activeBrokenFromSharing}
                setActiveBrokenFromSharing={queueLogic.setActiveBrokenFromSharing}
                sharingGroups={sharingGroups}
                setSharingGroups={setSharingGroups}
                
                // Page type for logging
                pageType="crop"
              />
            </div>
            
            {/* Crop layer panel - 1/3 width */}
            <div style={{ 
              flex: '1',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0, // Allow shrinking
              height: '100%' // Fill container height
            }}>
              <CropLayerPanel
                layers={layers}
                onUpdateLayers={setCurrentData}
                selectedLayerId={selectedId}
                setSelectedLayerId={setSelectedId}
                currentItem={queueLogic.currentItem}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: OutputCanvas with floating Gizmo Toolbar */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative' // Allow absolute positioning of gizmo toolbar
        }}>
          {/* Floating Gizmo toolbar above output canvas - left aligned */}
          <div style={{
            position: 'absolute',
            top: '-60px', // Float above the output canvas
            left: '0', // Left align with output canvas
            zIndex: 10
          }}>
            <GizmoToolbar
              mode={gizmoMode}
              setMode={setGizmoMode}
              scaleLocked={scaleLocked}
              setScaleLocked={setScaleLocked}
              horizontal={true} // Use horizontal layout
            />
          </div>

          {/* Output canvas */}
          <OutputCanvas
            videoRef={videoRef}
            displaySize={queueLogic.displayFrameSize}
            videoSize={queueLogic.videoSize}
            cropLayers={layers}
            captionLayers={captionOverrides[queueLogic.currentItem?.id] || []}
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
      </div>
    );
  }, [currentData, getOutputResolution, queueLogic, selectedId, setCurrentData, cropOverrides, getItemData, getSharedData, setCropOverrides, sharingGroups, setSharingGroups, captionOverrides, windowScale, windowScalePresets]);

  return (
    <div style={{ padding: `var(--scaled-spacing-lg, 20px)` }}>
      <h2 style={{ 
        fontSize: `var(--scaled-font-lg, 18px)`,
        marginBottom: `var(--scaled-spacing-base, 12px)`
      }}>📐 Crop Editor</h2>
      
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

          {/* Crop editor */}
          {renderCropEditor()}
        </>
      )}
    </div>
  );
};

export default CropPage;
