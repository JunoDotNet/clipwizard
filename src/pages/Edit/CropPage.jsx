import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import VideoCanvas from '../../components/Crop/VideoCanvas';
import VerticalCanvas from '../../components/Crop/VerticalCanvas';

const CropPage = () => {
  const videoRef = useRef(null);
  const {
    selectedFile, videoSrc, clipTabs, cropQueue, setCropQueue,
    sharedCropLayers, setSharedCropLayers,
    cropOverrides, setCropOverrides,
    sceneSegments, setSceneSegments, // <-- now from context
    transcript // <-- add transcript from context
  } = useAppContext();

  const [videoSize, setVideoSize] = useState({ width: 1920, height: 1080 });
  const [videoDuration, setVideoDuration] = useState(0);

  const [layers, setLayers] = useState([]);
  const [editingCrop, setEditingCrop] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  const [queueIndex, setQueueIndex] = useState(0);
  const currentItem = cropQueue[queueIndex];
  const [queueSource, setQueueSource] = useState('allCuts');
  const [brokenFromSharing, setBrokenFromSharing] = useState(new Set()); // Track clips manually broken from sharing
  const [copiedLayers, setCopiedLayers] = useState(null); // Store copied crop data
  const [sourceClipLabel, setSourceClipLabel] = useState(''); // Label of the clip we copied from
  const [sharedGroups, setSharedGroups] = useState({}); // Track custom shared groups: { groupId: [clipIds] }

  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(0);


  const displayScale = 1;
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
    console.log('📦 New crop queue:', queue);
    }, [clipTabs, queueSource, setCropQueue, selectedFile, videoDuration]);


  // Track if layers update is from user or programmatic (clip switch)
  const programmaticUpdateRef = useRef(false);

  useEffect(() => {
    if (!currentItem) return;
    
    // Check if this clip has an override, if not create one from shared layers
    let override = cropOverrides[currentItem.id];
    if (!override) {
      // Auto-create override for this clip
      override = JSON.parse(JSON.stringify(sharedCropLayers));
      setCropOverrides(prev => ({
        ...prev,
        [currentItem.id]: override
      }));
      console.log(`🆕 Auto-created override for ${currentItem.id}`);
    }
    
    // Always use override (either existing or newly created)
    programmaticUpdateRef.current = true;
    setLayers(JSON.parse(JSON.stringify(override)));
    console.log(`📄 Using OVERRIDE layers for ${currentItem.id}`);
  }, [currentItem, sharedCropLayers, cropOverrides, setCropOverrides]);


  // Save override only if user changed layers (not when switching clips)
  useEffect(() => {
    if (!currentItem) return;
    if (programmaticUpdateRef.current) {
      programmaticUpdateRef.current = false;
      return;
    }
    
    // Debounce the save to prevent jittery behavior during drag operations
    const timeoutId = setTimeout(() => {
      const layersJson = JSON.stringify(layers);
      
      // Check if current clip was manually broken from sharing
      const isManuallyBroken = brokenFromSharing.has(currentItem.id);
      
      if (isManuallyBroken) {
        // This clip has been manually broken from sharing - only update this specific clip
        setCropOverrides(prev => ({
          ...prev,
          [currentItem.id]: JSON.parse(JSON.stringify(layers))
        }));
        console.log(`💾 Updated isolated override for ${currentItem.id} (broken from sharing)`);
      } else {
        // Check if this clip is in a custom shared group
        let customGroupId = null;
        for (const [groupId, clipIds] of Object.entries(sharedGroups)) {
          if (clipIds.includes(currentItem.id)) {
            customGroupId = groupId;
            break;
          }
        }
        
        if (customGroupId) {
          // Update all clips in the custom shared group
          const groupClipIds = sharedGroups[customGroupId];
          const newOverrides = {};
          groupClipIds.forEach(clipId => {
            newOverrides[clipId] = JSON.parse(JSON.stringify(layers));
          });
          
          setCropOverrides(prev => ({
            ...prev,
            ...newOverrides
          }));
          
          console.log(`💾 Updated custom shared group ${customGroupId} with ${groupClipIds.length} clips:`, groupClipIds);
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
            const newOverrides = {};
            sameClips.forEach(clip => {
              // Only update if this clip hasn't been manually broken and isn't in a custom group
              const isInCustomGroup = Object.values(sharedGroups).some(groupClips => groupClips.includes(clip.id));
              if (!brokenFromSharing.has(clip.id) && !isInCustomGroup) {
                newOverrides[clip.id] = JSON.parse(JSON.stringify(layers));
              }
            });
            
            setCropOverrides(prev => ({
              ...prev,
              ...newOverrides
            }));
            
            console.log(`💾 Updated natural shared clips for ${Object.keys(newOverrides).length} instances of clip (${currentItem.start}s-${currentItem.end}s):`, Object.keys(newOverrides));
          }
        }
      }
    }, 100); // 100ms debounce delay
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line
  }, [layers, currentItem?.id, clipTabs, brokenFromSharing, sharedGroups]);

  useEffect(() => {
    if (currentItem) {
      console.log('🎯 Now cropping:', currentItem);
    }
  }, [currentItem]);

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

  return (
    <div style={{ padding: 20 }}>
      <h2>📐 Crop Editor</h2>
      {!videoSrc ? (
        <p style={{ color: '#999' }}>⚠️ No video loaded. Please import one first.</p>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="source-select" style={{ marginRight: 8 }}>Crop Source:</label>
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
                onClick={async () => {
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
                }}
            >
                🧠 Run Scene Detection
            </button>
            )}

            </div>


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
        </>
      )}

      {cropQueue.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h4 style={{ margin: 0 }}>🎞 Crop Queue</h4>
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
            {copiedLayers && (
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
                    setCopiedLayers(null);
                    setSourceClipLabel('');
                    console.log('🗑️ Cleared copied crop data');
                  }}
                  title="Clear copied crop data"
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
                      // Check if manually broken first
                      if (brokenFromSharing.has(item.id)) {
                        return 'BROKEN';
                      }
                      
                      // Check if in a custom shared group
                      for (const [groupId, clipIds] of Object.entries(sharedGroups)) {
                        if (clipIds.includes(item.id)) {
                          return `SHARED (${clipIds.length})`;
                        }
                      }
                      
                      // Check natural sharing (same start/end times)
                      const allClips = clipTabs.flatMap(tab =>
                        tab.clips.map((clip, index) => ({
                          id: `${tab.id}-clip-${index}`,
                          start: clip.start,
                          end: clip.end
                        }))
                      );
                      
                      const sameClipsCount = allClips.filter(c => 
                        c.start === item.start && c.end === item.end
                      ).length;
                      
                      return sameClipsCount > 1 ? 'SHARED' : 'UNIQUE';
                    })()}
                  </span>
                  {(() => {
                    // Show override button only for SHARED clips
                    const allClips = clipTabs.flatMap(tab =>
                      tab.clips.map((clip, index) => ({
                        id: `${tab.id}-clip-${index}`,
                        start: clip.start,
                        end: clip.end
                      }))
                    );
                    
                    const sameClipsCount = allClips.filter(c => 
                      c.start === item.start && c.end === item.end
                    ).length;
                    
                    const isShared = sameClipsCount > 1;
                    const isAlreadyBroken = brokenFromSharing.has(item.id);
                    
                    if (isShared && !isAlreadyBroken) {
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
                            const currentOverride = cropOverrides[item.id] || sharedCropLayers;
                            setCropOverrides(prev => ({
                              ...prev,
                              [item.id]: JSON.parse(JSON.stringify(currentOverride))
                            }));
                            
                            // Mark this clip as manually broken from sharing
                            setBrokenFromSharing(prev => new Set([...prev, item.id]));
                            
                            // Update layers if this is the current item
                            if (item.id === currentItem?.id) {
                              programmaticUpdateRef.current = true;
                              setLayers(JSON.parse(JSON.stringify(currentOverride)));
                            }
                            
                            console.log(`🔧 Created unique override for ${item.id}, breaking sharing`);
                          }}
                          title="Break sharing and create unique crop for this clip"
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
                      // Copy the current crop layers from this clip
                      const clipLayers = cropOverrides[item.id] || sharedCropLayers;
                      setCopiedLayers(JSON.parse(JSON.stringify(clipLayers)));
                      setSourceClipLabel(item.label);
                      console.log(`📋 Copied crop data from ${item.label}`);
                    }}
                    title={`Copy crop data from ${item.label}`}
                  >
                    Copy
                  </button>
                  
                  {/* Paste button - only available if we have copied data */}
                  {copiedLayers && (
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
                        // Paste the copied layers to this clip and make it share with the source
                        
                        // Find the source clip that has this exact crop data
                        let sourceClipId = null;
                        for (const [clipId, override] of Object.entries(cropOverrides)) {
                          if (JSON.stringify(override) === JSON.stringify(copiedLayers)) {
                            sourceClipId = clipId;
                            break;
                          }
                        }
                        
                        if (sourceClipId) {
                          // Find what the source clip is sharing with (natural or custom group)
                          let sourceGroupId = null;
                          let sourceClipIds = [];
                          
                          for (const [groupId, clipIds] of Object.entries(sharedGroups)) {
                            if (clipIds.includes(sourceClipId)) {
                              sourceGroupId = groupId;
                              sourceClipIds = [...clipIds];
                              break;
                            }
                          }
                          
                          if (!sourceGroupId) {
                            // Source isn't in a custom group, so it's using natural sharing
                            // Find all clips that naturally share with the source
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
                                clip.end === sourceClipFromQueue.end
                              );
                              
                              sourceClipIds = allNaturallySharedClips.map(c => c.id);
                            }
                          }
                          
                          // Check if the target clip is in a shared group (natural or custom)
                          let targetGroupId = null;
                          let targetClipIds = [];
                          
                          for (const [groupId, clipIds] of Object.entries(sharedGroups)) {
                            if (clipIds.includes(item.id)) {
                              targetGroupId = groupId;
                              targetClipIds = [...clipIds];
                              break;
                            }
                          }
                          
                          if (!targetGroupId) {
                            // Target isn't in a custom group, check for natural sharing
                            const allNaturallySharedClips = clipTabs.flatMap(tab =>
                              tab.clips.map((clip, index) => ({
                                id: `${tab.id}-clip-${index}`,
                                start: clip.start,
                                end: clip.end
                              }))
                            ).filter(clip => 
                              clip.start === item.start && 
                              clip.end === item.end
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
                          
                          setSharedGroups(prev => {
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
                          
                          // Update crop overrides for all merged clips
                          const newOverrides = {};
                          allMergedClipIds.forEach(clipId => {
                            newOverrides[clipId] = JSON.parse(JSON.stringify(copiedLayers));
                          });
                          
                          setCropOverrides(prev => ({
                            ...prev,
                            ...newOverrides
                          }));
                          
                          // Remove all merged clips from broken sharing
                          setBrokenFromSharing(prev => {
                            const newSet = new Set(prev);
                            allMergedClipIds.forEach(clipId => newSet.delete(clipId));
                            return newSet;
                          });
                          
                          // Update layers if current item is affected
                          if (allMergedClipIds.includes(currentItem?.id)) {
                            programmaticUpdateRef.current = true;
                            setLayers(JSON.parse(JSON.stringify(copiedLayers)));
                          }
                          
                          console.log(`📋 Merged shared groups into ${newGroupId} with ${allMergedClipIds.length} clips:`, allMergedClipIds);
                        } else {
                          // Source not found, just apply to target clip only
                          setCropOverrides(prev => ({
                            ...prev,
                            [item.id]: JSON.parse(JSON.stringify(copiedLayers))
                          }));
                          
                          // Update layers if this is the current item
                          if (item.id === currentItem?.id) {
                            programmaticUpdateRef.current = true;
                            setLayers(JSON.parse(JSON.stringify(copiedLayers)));
                          }
                          
                          console.log(`📋 Pasted crop data to ${item.label} (source not found)`);
                        }
                      }}
                      title={`Paste crop data from ${sourceClipLabel}`}
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

export default CropPage;
