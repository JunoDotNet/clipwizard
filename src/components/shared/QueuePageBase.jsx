import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';

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
}) => {
  const videoRef = useRef(null);
  const {
    selectedFile, videoSrc, clipTabs, cropQueue, setCropQueue,
    sceneSegments, setSceneSegments,
    transcript, // Add transcript from context
  } = useAppContext();

  const [videoSize, setVideoSize] = useState({ width: 1920, height: 1080 });
  const [videoDuration, setVideoDuration] = useState(0);
  const [queueIndex, setQueueIndex] = useState(0);
  const currentItem = cropQueue[queueIndex];
  const [queueSource, setQueueSource] = useState('allCuts');

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

  // Jump to clip function - seeks video to clip start time
  const jumpToClip = (item) => {
    if (!item || !videoRef.current) return;
    
    try {
      const video = videoRef.current;
      const targetTime = item.start || 0;
      
      if (video.readyState >= 2) { // HAVE_CURRENT_DATA or better
        video.currentTime = targetTime;
        console.log(`⏭ Jumped to clip ${item.id} at ${targetTime}s`);
      } else {
        // If video isn't ready, wait for it to load
        const onLoadedData = () => {
          video.currentTime = targetTime;
          console.log(`⏭ Jumped to clip ${item.id} at ${targetTime}s (after load)`);
          video.removeEventListener('loadeddata', onLoadedData);
        };
        video.addEventListener('loadeddata', onLoadedData);
      }
    } catch (error) {
      console.error('❌ Failed to jump to clip:', error);
    }
  };

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
        tab.clips.map((clip, index) => {
            const startOffset = clip.startOffset || 0;
            const endOffset = clip.endOffset || 0;
            const adjustedStart = clip.start + startOffset;
            const adjustedEnd = clip.end + endOffset;
            
            return {
                id: `${tab.id}-clip-${index}`,
                start: clip.start,
                end: clip.end,
                startOffset: startOffset,
                endOffset: endOffset,
                label: `${tab.name} - Clip ${index + 1} [${adjustedStart.toFixed(1)}s→${adjustedEnd.toFixed(1)}s]`,
                text: clip.text,
                sourceTabId: tab.id,
            };
        })
        );
    } else if (queueSource === 'fullVideo') {
        // Full Video = all transcript clips from whisper
        if (transcript && transcript.length > 0) {
          queue = transcript.map((clip, index) => ({
            id: `transcript-clip-${index}`,
            start: clip.start,
            end: clip.end,
            startOffset: 0, // ✅ Transcript clips don't have offsets but include for consistency
            endOffset: 0,   // ✅ Transcript clips don't have offsets but include for consistency
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
        queue = tab.clips.map((clip, index) => {
            const startOffset = clip.startOffset || 0;
            const endOffset = clip.endOffset || 0;
            const adjustedStart = clip.start + startOffset;
            const adjustedEnd = clip.end + endOffset;
            
            return {
                id: `${tab.id}-clip-${index}`,
                start: clip.start,
                end: clip.end,
                startOffset: startOffset,
                endOffset: endOffset,
                label: `${tab.name} - Clip ${index + 1} [${adjustedStart.toFixed(1)}s→${adjustedEnd.toFixed(1)}s]`,
                text: clip.text,
                sourceTabId: tab.id,
            };
        });
        }
    }

    setCropQueue(queue);
    setQueueIndex(0);
    console.log('📦 New queue with offsets:', queue.map(q => ({
      id: q.id,
      start: q.start,
      end: q.end,
      startOffset: q.startOffset,
      endOffset: q.endOffset,
      adjustedStart: q.start + (q.startOffset || 0),
      adjustedEnd: q.end + (q.endOffset || 0)
    })));
    
    // Also log the raw clip data to see what we're getting
    if (queueSource !== 'fullVideo' && queueSource !== 'scenes') {
      const tab = clipTabs.find(t => t.id === queueSource);
      if (tab) {
        console.log('📋 Raw tab clips with offsets:', tab.clips.map(clip => ({
          id: clip.id,
          start: clip.start,
          end: clip.end,
          startOffset: clip.startOffset,
          endOffset: clip.endOffset,
          hasStartOffset: 'startOffset' in clip,
          hasEndOffset: 'endOffset' in clip,
          fullClip: clip
        })));
      } else {
        console.log('📋 Tab not found for queueSource:', queueSource, 'Available tabs:', clipTabs.map(t => t.id));
      }
    }
    }, [clipTabs, queueSource, setCropQueue, selectedFile, videoDuration, sceneSegments, transcript]);

  // Debug: Log when clipTabs change
  useEffect(() => {
    console.log('📋 ClipTabs changed, checking for offsets:', clipTabs.map(tab => ({
      tabId: tab.id,
      tabName: tab.name,
      clips: tab.clips.map(clip => ({
        id: clip.id,
        start: clip.start,
        end: clip.end,
        startOffset: clip.startOffset,
        endOffset: clip.endOffset,
        hasOffsets: !!(clip.startOffset || clip.endOffset)
      }))
    })));
  }, [clipTabs]);

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

  // Auto-jump to clip when currentItem changes (for initial load and manual selection)
  useEffect(() => {
    if (currentItem) {
      jumpToClip(currentItem);
    }
  }, [currentItem]);

  // Save override when data changes
  useEffect(() => {
    if (!currentItem || !onDataChange) return;
    if (programmaticUpdateRef.current) {
      programmaticUpdateRef.current = false;
      return;
    }
    
    // Debounce the save to prevent jittery behavior during drag operations
    const timeoutId = setTimeout(() => {
      // Simple override save for the current item
      const itemOverrides = getItemData();
      const newOverrides = {
        ...itemOverrides,
        [currentItem.id]: JSON.parse(JSON.stringify(currentData))
      };
      setItemData(newOverrides);
      console.log(`💾 Updated ${pageType} data for ${currentItem.id}`);
      
      if (onDataChange) {
        onDataChange(currentData);
      }
    }, 100); // 100ms debounce delay
    
    return () => clearTimeout(timeoutId);
  }, [currentData, currentItem?.id, getItemData, setItemData, onDataChange, pageType]);

  useEffect(() => {
    if (currentItem) {
      console.log(`🎯 Now editing ${pageType}:`, currentItem);
    }
  }, [currentItem, pageType]);
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

          {renderEditor && renderEditor({
            videoRef,
            videoSrc,
            videoSize,
            displayVideoSize: {
              width: videoSize.width * 0.5,
              height: videoSize.height * 0.5,
            },
            displayFrameSize: {
              width: videoSize.height * 0.5,
              height: videoSize.width * 0.5,
            },
            currentData,
            setCurrentData,
            currentItem,
            // Add queue-related parameters
            cropQueue,
            queueIndex,
            setQueueIndex
          })}
        </>
      )}
    </div>
  );
};

export default QueuePageBase;
