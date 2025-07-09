import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

const QueuePageBase = ({ 
  pageType, // 'crop' or 'caption'
  title,
  renderEditor, // function that renders the specific editor (crop canvas, caption editor, etc.)
  getItemData, // function to get item-specific data (cropOverrides, captionOverrides, etc.)
  setItemData, // function to set item-specific data
  getSharedData, // function to get shared data (sharedCropLayers, sharedCaptionSettings, etc.)
  setSharedData, // function to set shared data
  currentData, // current data being edited (layers, captions, etc.)
  setCurrentData, // function to set current data
  onDataChange, // callback when data changes
  copiedDataKey = 'copiedData', // key for copied data in state
  sourceClipLabelKey = 'sourceClipLabel' // key for source clip label in state
}) => {
  const videoRef = useRef(null);
  const {
    selectedFile, videoSrc, clipTabs, cropQueue, setCropQueue,
    sceneSegments, setSceneSegments,
    transcript,
    // Use different sharing states based on pageType
    brokenFromSharing, setBrokenFromSharing,
    sharedGroups, setSharedGroups,
    captionBrokenFromSharing, setCaptionBrokenFromSharing,
    captionSharedGroups, setCaptionSharedGroups
  } = useAppContext();

  // Select the appropriate sharing state based on pageType
  const activeBrokenFromSharing = pageType === 'caption' ? captionBrokenFromSharing : brokenFromSharing;
  const setActiveBrokenFromSharing = pageType === 'caption' ? setCaptionBrokenFromSharing : setBrokenFromSharing;
  const activeSharedGroups = pageType === 'caption' ? captionSharedGroups : sharedGroups;
  const setActiveSharedGroups = pageType === 'caption' ? setCaptionSharedGroups : setSharedGroups;

  const [videoSize, setVideoSize] = useState({ width: 1920, height: 1080 });
  const [videoDuration, setVideoDuration] = useState(0);

  const [queueIndex, setQueueIndex] = useState(0);
  const currentItem = cropQueue[queueIndex];
  const [queueSource, setQueueSource] = useState('allCuts');
  const [copiedData, setCopiedData] = useState(null); // Store copied data
  const [sourceClipLabel, setSourceClipLabel] = useState(''); // Label of the clip we copied from

  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(0);

  const displayScale = 0.5;
  const displayVideoSize = {
    width: videoSize.width * displayScale,
    height: videoSize.height * displayScale,
  };
  const displayFrameSize = {
    width: videoSize.height * displayScale,
    height: videoSize.width * displayScale,
  };

  // Load resolution
  useEffect(() => {
    const fetchResolution = async () => {
      if (!selectedFile?.path || !window.electronAPI) return;
      try {
        const resolution = await window.electronAPI.getVideoResolution(selectedFile.path);
        if (resolution?.width && resolution?.height) {
          setVideoSize({ width: resolution.width, height: resolution.height });
        }
      } catch (err) {
        console.error('❌ Failed to load video resolution:', err);
      }
    };
    fetchResolution();
  }, [selectedFile]);

  // Get duration
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const duration = video.duration;
      if (duration && !isNaN(duration)) {
        setVideoDuration(duration);
        console.log('⏱ Video duration:', duration.toFixed(2));
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [videoRef]);

  // Generate queue based on source
  useEffect(() => {
    if (!queueSource) return;

    // 🧠 Run Scene Detection
    if (queueSource === 'sceneDetect') {
        if (sceneSegments.length > 0) {
            const queue = sceneSegments.map((scene, index) => ({
            id: `scene-${index}`,
            start: scene.start,
            end: scene.end,
            label: scene.label || `Scene ${index + 1}`,
            sourceType: 'scene',
            }));
            setCropQueue(queue);
            setQueueIndex(0);
            console.log('🎬 Loaded existing scenes:', queue);
        } else {
            setCropQueue([]);
            setQueueIndex(0);
            console.warn('⚠️ Scene detection not run yet.');
        }
        return;
        }

    // 🧩 Default queue logic
    if (!clipTabs || clipTabs.length === 0) return;

    let queue = [];

    if (queueSource === 'allCuts') {
        queue = clipTabs.flatMap(tab =>
        tab.clips.map((clip, index) => ({
            id: `${tab.id}-clip-${index}`,
            start: clip.start,
            end: clip.end,
            label: `${tab.name} - Clip ${index + 1}`,
            sourceTabId: tab.id,
        }))
        );
    } else if (queueSource === 'fullVideo') {
        // Full Video = all transcript clips from whisper
        if (transcript && transcript.length > 0) {
          queue = transcript.map((clip, index) => ({
            id: `transcript-clip-${index}`,
            start: clip.start,
            end: clip.end,
            label: `Transcript - Clip ${index + 1}`,
            text: clip.text,
            sourceTabId: null,
          }));
        } else {
          queue = [];
        }
    } else {
        const tab = clipTabs.find(t => t.id === queueSource);
        if (tab) {
        queue = tab.clips.map((clip, index) => ({
            id: `${tab.id}-clip-${index}`,
            start: clip.start,
            end: clip.end,
            label: `${tab.name} - Clip ${index + 1}`,
            sourceTabId: tab.id,
        }));
        }
    }

    setCropQueue(queue);
    setQueueIndex(0);
    console.log('📦 New queue:', queue);
    }, [clipTabs, queueSource, setCropQueue, selectedFile, videoDuration, sceneSegments, transcript]);

  // Track if data update is from user or programmatic (clip switch)
  const programmaticUpdateRef = useRef(false);

  useEffect(() => {
    if (!currentItem) return;
    
    // Check if this clip has an override, if not create one from shared data
    const itemOverrides = getItemData();
    let override = itemOverrides[currentItem.id];
    if (!override) {
      // Auto-create override for this clip
      override = JSON.parse(JSON.stringify(getSharedData()));
      const newOverrides = {
        ...itemOverrides,
        [currentItem.id]: override
      };
      setItemData(newOverrides);
      console.log(`🆕 Auto-created override for ${currentItem.id}`);
    }
    
    // Always use override (either existing or newly created)
    programmaticUpdateRef.current = true;
    setCurrentData(JSON.parse(JSON.stringify(override)));
    console.log(`📄 Using OVERRIDE data for ${currentItem.id}`);
  }, [currentItem, getSharedData, getItemData]);

  // Save override only if user changed data (not when switching clips)
  useEffect(() => {
    if (!currentItem || !onDataChange) return;
    if (programmaticUpdateRef.current) {
      programmaticUpdateRef.current = false;
      return;
    }
    
    // Debounce the save to prevent jittery behavior during drag operations
    const timeoutId = setTimeout(() => {
      const dataJson = JSON.stringify(currentData);
      
      // Check if current clip was manually broken from sharing
      const isManuallyBroken = activeBrokenFromSharing.has(currentItem.id);
      
      if (isManuallyBroken) {
        // This clip has been manually broken from sharing - only update this specific clip
        const itemOverrides = getItemData();
        const newOverrides = {
          ...itemOverrides,
          [currentItem.id]: JSON.parse(JSON.stringify(currentData))
        };
        setItemData(newOverrides);
        console.log(`💾 Updated isolated ${pageType} override for ${currentItem.id} (broken from sharing)`);
      } else {
        // Check if this clip is in a custom shared group
        let customGroupId = null;
        for (const [groupId, clipIds] of Object.entries(activeSharedGroups)) {
          if (clipIds.includes(currentItem.id)) {
            customGroupId = groupId;
            break;
          }
        }
        
        if (customGroupId) {
          // Update all clips in the custom shared group
          const groupClipIds = activeSharedGroups[customGroupId];
          const itemOverrides = getItemData();
          const newOverrides = { ...itemOverrides };
          groupClipIds.forEach(clipId => {
            newOverrides[clipId] = JSON.parse(JSON.stringify(currentData));
          });
          
          setItemData(newOverrides);
          
          console.log(`💾 Updated custom ${pageType} shared group ${customGroupId} with ${groupClipIds.length} clips:`, groupClipIds);
        } else {
          // Default behavior: update all clips with same start/end times
          const allClips = clipTabs.flatMap(tab =>
            tab.clips.map((clip, index) => ({
              id: `${tab.id}-clip-${index}`,
              start: clip.start,
              end: clip.end
            }))
          );
          
          const sameClips = allClips.filter(clip => 
            clip.start === currentItem.start && clip.end === currentItem.end
          );
          
          // Update override for all instances of this same clip (except those manually broken or in custom groups)
          if (sameClips.length > 0) {
            const itemOverrides = getItemData();
            const newOverrides = { ...itemOverrides };
            sameClips.forEach(clip => {
              // Only update if this clip hasn't been manually broken and isn't in a custom group
              const isInCustomGroup = Object.values(activeSharedGroups).some(groupClips => groupClips.includes(clip.id));
              if (!activeBrokenFromSharing.has(clip.id) && !isInCustomGroup) {
                newOverrides[clip.id] = JSON.parse(JSON.stringify(currentData));
              }
            });
            
            setItemData(newOverrides);
            
            console.log(`💾 Updated natural shared ${pageType} clips for ${Object.keys(newOverrides).length - Object.keys(getItemData()).length} instances of clip (${currentItem.start}s-${currentItem.end}s)`);
          }
        }
      }
    }, 100); // 100ms debounce delay
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line
  }, [currentData, currentItem?.id, clipTabs, activeBrokenFromSharing, activeSharedGroups, pageType]);

  useEffect(() => {
    if (currentItem) {
      console.log(`🎯 Now editing ${pageType}:`, currentItem);
    }
  }, [currentItem, pageType]);

  // Function to jump video to clip start time
  const jumpToClip = (clip) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = clip.start;
    console.log(`⏯️ Jumped to ${clip.label} at ${clip.start}s`);
  };

  // Function to play all clips sequentially
  const playAllClips = () => {
    if (cropQueue.length === 0) return;
    
    setIsPlayingAll(true);
    setCurrentPlayingIndex(0);
    const firstClip = cropQueue[0];
    const video = videoRef.current;
    if (video) {
      video.currentTime = firstClip.start;
      video.play();
    }
    console.log('▶️ Starting to play all clips');
  };

  // Function to stop playing all
  const stopPlayingAll = () => {
    setIsPlayingAll(false);
    setCurrentPlayingIndex(0);
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
    console.log('⏸️ Stopped playing all clips');
  };

  // Monitor video time to advance to next clip
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlayingAll) return;

    const handleTimeUpdate = () => {
      if (currentPlayingIndex >= cropQueue.length) return;
      
      const currentClip = cropQueue[currentPlayingIndex];
      if (video.currentTime >= currentClip.end) {
        // Move to next clip
        const nextIndex = currentPlayingIndex + 1;
        if (nextIndex < cropQueue.length) {
          setCurrentPlayingIndex(nextIndex);
          const nextClip = cropQueue[nextIndex];
          video.currentTime = nextClip.start;
          console.log(`⏭️ Advanced to ${nextClip.label}`);
        } else {
          // Finished all clips
          setIsPlayingAll(false);
          setCurrentPlayingIndex(0);
          video.pause();
          console.log('🏁 Finished playing all clips');
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isPlayingAll, currentPlayingIndex, cropQueue]);

  const handleSceneDetection = async () => {
    if (!selectedFile?.path || !window.electronAPI) return;
    try {
        const scenes = await window.electronAPI.detectScenes(selectedFile.path);
        const sceneQueue = scenes.map((scene, index) => ({
        id: `scene-${index}`,
        start: scene.start,
        end: scene.end,
        label: scene.label || `Scene ${index + 1}`,
        sourceType: 'scene',
        }));
        setSceneSegments(sceneQueue); // 🧠 store scenes in memory
        setCropQueue(sceneQueue);     // ✅ use them as queue
        setQueueIndex(0);
        console.log('🎬 Ran scene detection:', sceneQueue);
    } catch (err) {
        console.error('❌ Scene detection failed:', err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>{title}</h2>
      {!videoSrc ? (
        <p style={{ color: '#999' }}>⚠️ No video loaded. Please import one first.</p>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="source-select" style={{ marginRight: 8 }}>Source:</label>
            <select
                id="source-select"
                value={queueSource}
                onChange={(e) => setQueueSource(e.target.value)}
            >
                <option value="allCuts">All Cut Clips</option>
                {clipTabs.map(tab => (
                <option key={tab.id} value={tab.id}>Only {tab.name}</option>
                ))}
                <option value="fullVideo">Full Video</option>
                <option value="sceneDetect">Scene Detection</option>
            </select>

            {queueSource === 'sceneDetect' && (
            <button
                style={{ marginLeft: 12 }}
                onClick={handleSceneDetection}
            >
                🧠 Run Scene Detection
            </button>
            )}
          </div>

          {renderEditor && renderEditor({
            videoRef,
            videoSrc,
            videoSize,
            displayVideoSize,
            displayFrameSize,
            currentData,
            setCurrentData,
            currentItem
          })}
        </>
      )}

      {cropQueue.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h4 style={{ margin: 0 }}>🎞 Queue</h4>
              {/* Play All button */}
              <button
                style={{
                  fontSize: 11,
                  padding: '4px 8px',
                  background: isPlayingAll ? '#ff6b6b' : '#52c41a',
                  color: 'white',
                  border: 'none',
                  borderRadius: 3,
                  cursor: 'pointer'
                }}
                onClick={isPlayingAll ? stopPlayingAll : playAllClips}
                title={isPlayingAll ? "Stop playing all clips" : "Play all clips sequentially"}
              >
                {isPlayingAll ? '⏸️ Stop' : '▶️ Play All'}
              </button>
            </div>
            {/* Show copied data status */}
            {copiedData && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                padding: '4px 8px',
                background: '#e8f8f5',
                border: '1px solid #4ecdc4',
                borderRadius: 4,
                fontSize: 13
              }}>
                <span>📋 Copied from: <strong>{sourceClipLabel}</strong></span>
                <button
                  style={{
                    fontSize: 11,
                    padding: '2px 6px',
                    background: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    borderRadius: 3,
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setCopiedData(null);
                    setSourceClipLabel('');
                    console.log('🗑️ Cleared copied data');
                  }}
                  title="Clear copied data"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
            {cropQueue.map((item, idx) => (
              <li
                key={item.id}
                style={{
                  padding: '6px 10px',
                  marginBottom: 4,
                  background: idx === queueIndex ? '#e0f7ff' : '#f4f4f4',
                  border: '1px solid #ccc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
                onClick={() => {
                  setQueueIndex(idx);
                  jumpToClip(item);
                }}
              >
                <span>
                  {item.label} ({item.start.toFixed(1)}s – {item.end.toFixed(1)}s)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#666', fontSize: 13 }}>
                    {/* Show sharing status */}
                    {(() => {
                      // First check if in a custom shared group
                      for (const [groupId, clipIds] of Object.entries(activeSharedGroups)) {
                        if (clipIds.includes(item.id)) {
                          return `SHARED (${clipIds.length})`;
                        }
                      }
                      
                      // Then check natural sharing (only if not manually broken)
                      if (!activeBrokenFromSharing.has(item.id)) {
                        const allClips = clipTabs.flatMap(tab =>
                          tab.clips.map((clip, index) => ({
                            id: `${tab.id}-clip-${index}`,
                            start: clip.start,
                            end: clip.end
                          }))
                        );
                        
                        // Count clips with same timing that aren't broken or in custom groups
                        const sameTimeClips = allClips.filter(c => 
                          c.start === item.start && c.end === item.end
                        );
                        
                        // Filter out clips that are broken or in custom groups
                        const availableForNaturalSharing = sameTimeClips.filter(clip => {
                          // Skip if broken
                          if (activeBrokenFromSharing.has(clip.id)) return false;
                          // Skip if in a custom group
                          for (const [groupId, clipIds] of Object.entries(activeSharedGroups)) {
                            if (clipIds.includes(clip.id)) return false;
                          }
                          return true;
                        });
                        
                        if (availableForNaturalSharing.length > 1) {
                          return `SHARED (${availableForNaturalSharing.length})`;
                        }
                      }
                      
                      return 'UNIQUE';
                    })()}
                  </span>
                  {(() => {
                    // Only show break button for clips that are actually shared and not already broken
                    if (activeBrokenFromSharing.has(item.id)) {
                      return null; // Already broken, no button needed
                    }
                    
                    let isShared = false;
                    
                    // Check if in a custom shared group
                    for (const [groupId, clipIds] of Object.entries(activeSharedGroups)) {
                      if (clipIds.includes(item.id)) {
                        isShared = true;
                        break;
                      }
                    }
                    
                    // If not in custom group, check natural sharing
                    if (!isShared) {
                      const allClips = clipTabs.flatMap(tab =>
                        tab.clips.map((clip, index) => ({
                          id: `${tab.id}-clip-${index}`,
                          start: clip.start,
                          end: clip.end
                        }))
                      );
                      
                      // Count clips with same timing that aren't broken or in custom groups
                      const sameTimeClips = allClips.filter(c => 
                        c.start === item.start && c.end === item.end
                      );
                      
                      const availableForNaturalSharing = sameTimeClips.filter(clip => {
                        if (activeBrokenFromSharing.has(clip.id)) return false;
                        for (const [groupId, clipIds] of Object.entries(activeSharedGroups)) {
                          if (clipIds.includes(clip.id)) return false;
                        }
                        return true;
                      });
                      
                      isShared = availableForNaturalSharing.length > 1;
                    }
                    
                    if (isShared) {
                      return (
                        <button
                          style={{ 
                            fontSize: 11, 
                            padding: '2px 6px',
                            background: '#ff6b6b',
                            color: 'white',
                            border: 'none',
                            borderRadius: 3,
                            cursor: 'pointer'
                          }}
                          onClick={e => {
                            e.stopPropagation();
                            // Create a unique override for this specific clip instance
                            const itemOverrides = getItemData();
                            const currentOverride = itemOverrides[item.id] || getSharedData();
                            const newOverrides = {
                              ...itemOverrides,
                              [item.id]: JSON.parse(JSON.stringify(currentOverride))
                            };
                            setItemData(newOverrides);
                            
                            // Mark this clip as manually broken from sharing
                            setActiveBrokenFromSharing(prev => new Set([...prev, item.id]));
                            
                            // Remove this clip from any custom shared groups
                            setActiveSharedGroups(prev => {
                              const newGroups = { ...prev };
                              for (const [groupId, clipIds] of Object.entries(newGroups)) {
                                if (clipIds.includes(item.id)) {
                                  const updatedClipIds = clipIds.filter(id => id !== item.id);
                                  if (updatedClipIds.length === 1) {
                                    // If only one clip remains, mark it as broken too so it doesn't 
                                    // accidentally share with natural clips that have the same timing
                                    const remainingClipId = updatedClipIds[0];
                                    setActiveBrokenFromSharing(prevBroken => new Set([...prevBroken, remainingClipId]));
                                    delete newGroups[groupId];
                                  } else if (updatedClipIds.length === 0) {
                                    // No clips left, delete the group
                                    delete newGroups[groupId];
                                  } else {
                                    // Multiple clips remain, keep the group
                                    newGroups[groupId] = updatedClipIds;
                                  }
                                  break;
                                }
                              }
                              return newGroups;
                            });
                            
                            // Update data if this is the current item
                            if (item.id === currentItem?.id) {
                              programmaticUpdateRef.current = true;
                              setCurrentData(JSON.parse(JSON.stringify(currentOverride)));
                            }
                            
                            console.log(`🔧 Broke sharing for ${item.id}`);
                          }}
                          title={`Break sharing and create unique ${pageType} data for this clip`}
                        >
                          Break
                        </button>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Copy button - always available */}
                  <button
                    style={{ 
                      fontSize: 11, 
                      padding: '2px 6px',
                      background: '#4ecdc4',
                      color: 'white',
                      border: 'none',
                      borderRadius: 3,
                      cursor: 'pointer',
                      marginLeft: 4
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      // Copy the current data from this clip
                      const itemOverrides = getItemData();
                      const clipData = itemOverrides[item.id] || getSharedData();
                      setCopiedData(JSON.parse(JSON.stringify(clipData)));
                      setSourceClipLabel(item.label);                        console.log(`📋 Copied ${pageType} data from ${item.label}`);
                    }}
                    title={`Copy data from ${item.label}`}
                  >
                    Copy
                  </button>
                  
                  {/* Paste button - only available if we have copied data */}
                  {copiedData && (
                    <button
                      style={{ 
                        fontSize: 11, 
                        padding: '2px 6px',
                        background: '#95e1d3',
                        color: 'black',
                        border: 'none',
                        borderRadius: 3,
                        cursor: 'pointer',
                        marginLeft: 4
                      }}
                      onClick={e => {
                        e.stopPropagation();
                        // Paste the copied data to this clip and make it share with the source
                        
                        // Find the source clip that has this exact data
                        let sourceClipId = null;
                        const itemOverrides = getItemData();
                        for (const [clipId, override] of Object.entries(itemOverrides)) {
                          if (JSON.stringify(override) === JSON.stringify(copiedData)) {
                            sourceClipId = clipId;
                            break;
                          }
                        }
                        
                        if (sourceClipId) {
                          // Find what the source clip is sharing with (natural or custom group)
                          let sourceGroupId = null;
                          let sourceClipIds = [];
                          
                          for (const [groupId, clipIds] of Object.entries(activeSharedGroups)) {
                            if (clipIds.includes(sourceClipId)) {
                              sourceGroupId = groupId;
                              sourceClipIds = [...clipIds];
                              break;
                            }
                          }
                          
                          if (!sourceGroupId) {
                            // Source isn't in a custom group, so it's using natural sharing
                            // Find all clips that naturally share with the source (excluding broken clips)
                            const sourceClipFromQueue = cropQueue.find(c => c.id === sourceClipId);
                            if (sourceClipFromQueue) {
                              const allNaturallySharedClips = clipTabs.flatMap(tab =>
                                tab.clips.map((clip, index) => ({
                                  id: `${tab.id}-clip-${index}`,
                                  start: clip.start,
                                  end: clip.end
                                }))
                              ).filter(clip => 
                                clip.start === sourceClipFromQueue.start && 
                                clip.end === sourceClipFromQueue.end &&
                                !activeBrokenFromSharing.has(clip.id) // Exclude broken clips
                              );
                              
                              sourceClipIds = allNaturallySharedClips.map(c => c.id);
                            }
                          }
                          
                          // Check if the target clip is in a shared group (natural or custom)
                          let targetGroupId = null;
                          let targetClipIds = [];
                          
                          for (const [groupId, clipIds] of Object.entries(activeSharedGroups)) {
                            if (clipIds.includes(item.id)) {
                              targetGroupId = groupId;
                              targetClipIds = [...clipIds];
                              break;
                            }
                          }
                          
                          if (!targetGroupId) {
                            // Target isn't in a custom group, check for natural sharing (excluding broken clips)
                            const allNaturallySharedClips = clipTabs.flatMap(tab =>
                              tab.clips.map((clip, index) => ({
                                id: `${tab.id}-clip-${index}`,
                                start: clip.start,
                                end: clip.end
                              }))
                            ).filter(clip => 
                              clip.start === item.start && 
                              clip.end === item.end &&
                              !activeBrokenFromSharing.has(clip.id) // Exclude broken clips
                            );
                            
                            if (allNaturallySharedClips.length > 1) {
                              targetClipIds = allNaturallySharedClips.map(c => c.id);
                            } else {
                              targetClipIds = [item.id];
                            }
                          }
                          
                          // Merge both groups into a new shared group
                          const newGroupId = `group-${Date.now()}`;
                          const allMergedClipIds = [...new Set([...sourceClipIds, ...targetClipIds])];
                          
                          setActiveSharedGroups(prev => {
                            const newGroups = { ...prev };
                            
                            // Remove old groups if they existed
                            if (sourceGroupId) {
                              delete newGroups[sourceGroupId];
                            }
                            if (targetGroupId) {
                              delete newGroups[targetGroupId];
                            }
                            
                            // Add the new merged group
                            newGroups[newGroupId] = allMergedClipIds;
                            
                            return newGroups;
                          });
                          
                          // Update overrides for all merged clips
                          const newOverrides = { ...itemOverrides };
                          allMergedClipIds.forEach(clipId => {
                            newOverrides[clipId] = JSON.parse(JSON.stringify(copiedData));
                          });
                          
                          setItemData(newOverrides);
                          
                          // Remove all merged clips from broken sharing
                          setActiveBrokenFromSharing(prev => {
                            const newSet = new Set(prev);
                            allMergedClipIds.forEach(clipId => newSet.delete(clipId));
                            return newSet;
                          });
                          
                          // Update data if current item is affected
                          if (allMergedClipIds.includes(currentItem?.id)) {
                            programmaticUpdateRef.current = true;
                            setCurrentData(JSON.parse(JSON.stringify(copiedData)));
                          }
                          
                          console.log(`📋 Merged shared groups into ${newGroupId} with ${allMergedClipIds.length} clips:`, allMergedClipIds);
                        } else {
                          // Source not found, just apply to target clip only
                          const newOverrides = {
                            ...itemOverrides,
                            [item.id]: JSON.parse(JSON.stringify(copiedData))
                          };
                          setItemData(newOverrides);
                          
                          // Update data if this is the current item
                          if (item.id === currentItem?.id) {
                            programmaticUpdateRef.current = true;
                            setCurrentData(JSON.parse(JSON.stringify(copiedData)));
                          }
                          
                          console.log(`📋 Pasted data to ${item.label} (source not found)`);
                        }
                      }}
                      title={`Paste data from ${sourceClipLabel}`}
                    >
                      Paste
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default QueuePageBase;
