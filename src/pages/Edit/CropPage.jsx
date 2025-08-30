// pages/Edit/CropPage.jsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import VideoCanvas from '../../components/crop/VideoCanvas';
import OutputCanvas from '../../components/shared/OutputCanvas';
import GizmoToolbar from '../../components/gizmo/GizmoToolbar';
import QueueControls from '../../components/shared/QueueControls';
import { useQueueLogic } from '../../hooks/useQueueLogic';

const CropPage = () => {
  const videoRef = useRef(null);
  const {
    sharedCropLayers, setSharedCropLayers,
    cropOverrides, setCropOverrides,
    captionOverrides,
    videoSrc,
    sharingGroups, setSharingGroups
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
      setCurrentData(JSON.parse(JSON.stringify(clipData)));
      console.log('🔄 Switched to clip data:', queueLogic.currentItem.id, clipData);
    }
  }, [queueLogic.currentItem?.id, hasInitialized, cropOverrides, sharedCropLayers, isUpdating]);

  // Save currentData changes to the current clip's override
  React.useEffect(() => {
    if (!queueLogic.currentItem || !hasInitialized) return;
    
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
      setTimeout(() => setIsUpdating(false), 50);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [currentData, queueLogic.currentItem?.id, cropOverrides, setCropOverrides, hasInitialized, sharingGroups]);

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

  const renderCropEditor = () => {
    const layers = currentData || [];

    return (
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Left column: source video and queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
          
          {/* Queue controls under the video */}
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

        {/* Middle: rendered OUTPUT with gizmo overlay on top */}
        <div style={{ position: 'relative' }}>
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
    <div style={{ padding: 20 }}>
      <h2>📐 Crop Editor</h2>
      
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
