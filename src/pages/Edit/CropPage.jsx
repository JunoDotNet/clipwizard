import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import VideoCanvas from '../../components/Crop/VideoCanvas';
import VerticalCanvas from '../../components/Crop/VerticalCanvas';

const CropPage = () => {
  const videoRef = useRef(null);
  const { selectedFile, videoSrc, clipTabs, cropQueue, setCropQueue } = useAppContext();

  const [videoSize, setVideoSize] = useState({ width: 1920, height: 1080 });
  const [videoDuration, setVideoDuration] = useState(0);
  const [layers, setLayers] = useState([]);
  const [editingCrop, setEditingCrop] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

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

  // Get actual video duration
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
      queue = [{
        id: 'full-video',
        start: 0,
        end: videoDuration || 0,
        label: 'Full Video',
        sourceTabId: null,
      }];
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
  }, [clipTabs, queueSource, setCropQueue, videoDuration]);

  useEffect(() => {
    if (currentItem) {
      console.log('🎯 Now cropping:', currentItem);
    }
  }, [currentItem]);

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
            </select>
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
          <h4>🎞 Crop Queue</h4>
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
                }}
                onClick={() => setQueueIndex(idx)}
              >
                {item.label} ({item.start.toFixed(1)}s – {item.end.toFixed(1)}s)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CropPage;
