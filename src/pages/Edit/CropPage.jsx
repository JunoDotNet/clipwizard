import React, { useRef, useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import VideoCanvas from '../../components/crop/VideoCanvas';
import VerticalCanvas from '../../components/crop/VerticalCanvas';

const CropPage = () => {
  const videoRef = useRef(null);
  const { selectedFile, videoSrc } = useAppContext();

  const [videoSize, setVideoSize] = useState({ width: 1920, height: 1080 });
  const [layers, setLayers] = useState([]);
  const [editingCrop, setEditingCrop] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);

  const displayScale = 0.5;

  const displayVideoSize = {
    width: videoSize.width * displayScale,
    height: videoSize.height * displayScale,
  };

  const displayFrameSize = {
    width: videoSize.height * displayScale,
    height: videoSize.width * displayScale,
  };

  // Load video resolution once
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

  return (
    <div style={{ padding: 20 }}>
      <h2>📐 Crop Editor</h2>
      {!videoSrc ? (
        <p style={{ color: '#999' }}>⚠️ No video loaded. Please import one first.</p>
      ) : (
        <div style={{ display: 'flex', gap: 40, marginTop: 20 }}>
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
      )}
    </div>
  );
};

export default CropPage;
