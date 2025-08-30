import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';

export const useQueueLogic = (pageType = 'crop') => {
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
  const [queueSource, setQueueSource] = useState('allCuts');
  const [copiedData, setCopiedData] = useState(null);
  const [sourceClipLabel, setSourceClipLabel] = useState('');
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(0);

  const currentItem = cropQueue[queueIndex];
  const programmaticUpdateRef = useRef(false);

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
          label: `Scene ${index + 1}`,
          tabId: 'scenes'
        }));
        setCropQueue(queue);
      }
      return;
    }

    // 🎬 Full Video
    if (queueSource === 'fullVideo') {
      if (videoDuration > 0) {
        setCropQueue([{
          id: 'full-video',
          start: 0,
          end: videoDuration,
          label: 'Full Video',
          tabId: 'full'
        }]);
      }
      return;
    }

    // 🔪 Selected Tab
    const selectedTab = clipTabs.find(t => t.id === queueSource);
    if (selectedTab?.clips) {
      const queue = selectedTab.clips.map((clip, index) => ({
        id: `${selectedTab.id}-clip-${index}`,
        start: clip.start,
        end: clip.end,
        label: clip.label || `${selectedTab.name} Clip ${index + 1}`,
        tabId: selectedTab.id,
        startOffset: clip.startOffset || 0,
        endOffset: clip.endOffset || 0
      }));
      setCropQueue(queue);
      return;
    }

    // 🗂 All Cuts (default)
    if (queueSource === 'allCuts') {
      const queue = clipTabs.flatMap(tab => 
        tab.clips.map((clip, index) => ({
          id: `${tab.id}-clip-${index}`,
          start: clip.start,
          end: clip.end,
          label: clip.label || `${tab.name} Clip ${index + 1}`,
          tabId: tab.id,
          startOffset: clip.startOffset || 0,
          endOffset: clip.endOffset || 0
        }))
      );
      setCropQueue(queue);
      return;
    }

  }, [queueSource, clipTabs, sceneSegments, videoDuration, setCropQueue]);

  // Scene detection handler
  const handleSceneDetection = async () => {
    if (!selectedFile?.path) return;
    
    try {
      const scenes = await window.electronAPI.detectScenes(selectedFile.path);
      if (scenes?.length > 0) {
        setSceneSegments(scenes);
        console.log(`🎬 Detected ${scenes.length} scenes`);
      }
    } catch (err) {
      console.error('❌ Scene detection failed:', err);
    }
  };

  // Playback functions
  const jumpToClip = (item, videoRef) => {
    if (!videoRef?.current || !item) return;
    
    const video = videoRef.current;
    const adjustedStart = item.start + (item.startOffset || 0);
    video.currentTime = Math.max(0, adjustedStart);
    console.log(`⏭ Jumped to ${item.label} at ${adjustedStart.toFixed(1)}s`);
  };

  const playAllClips = (videoRef) => {
    if (!videoRef?.current || cropQueue.length === 0) return;
    
    setIsPlayingAll(true);
    setCurrentPlayingIndex(0);
    playClipAtIndex(0, videoRef);
  };

  const stopPlayingAll = () => {
    setIsPlayingAll(false);
    setCurrentPlayingIndex(0);
  };

  const playClipAtIndex = (index, videoRef) => {
    if (!videoRef?.current || !cropQueue[index]) return;
    
    const item = cropQueue[index];
    const video = videoRef.current;
    const adjustedStart = item.start + (item.startOffset || 0);
    const adjustedEnd = item.end + (item.endOffset || 0);
    
    video.currentTime = Math.max(0, adjustedStart);
    video.play();
    
    console.log(`▶️ Playing clip ${index + 1}/${cropQueue.length}: ${item.label}`);
    
    const handleTimeUpdate = () => {
      if (video.currentTime >= adjustedEnd) {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        
        if (index + 1 < cropQueue.length && isPlayingAll) {
          setCurrentPlayingIndex(index + 1);
          setTimeout(() => playClipAtIndex(index + 1, videoRef), 500);
        } else {
          video.pause();
          setIsPlayingAll(false);
          setCurrentPlayingIndex(0);
          console.log('🎬 Finished playing all clips');
        }
      }
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
  };

  return {
    // State
    videoSize,
    setVideoSize,
    videoDuration,
    setVideoDuration,
    queueIndex,
    setQueueIndex,
    queueSource,
    setQueueSource,
    copiedData,
    setCopiedData,
    sourceClipLabel,
    setSourceClipLabel,
    isPlayingAll,
    currentPlayingIndex,
    currentItem,
    programmaticUpdateRef,
    
    // Computed values
    displayScale,
    displayVideoSize,
    displayFrameSize,
    
    // Context values
    selectedFile,
    videoSrc,
    clipTabs,
    cropQueue,
    transcript,
    activeBrokenFromSharing,
    setActiveBrokenFromSharing,
    activeSharedGroups,
    setActiveSharedGroups,
    
    // Functions
    handleSceneDetection,
    jumpToClip,
    playAllClips,
    stopPlayingAll,
    playClipAtIndex
  };
};
