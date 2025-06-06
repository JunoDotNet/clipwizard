// src/components/ProjectControls.jsx
import React from 'react';

const ProjectControls = ({
  setTranscript,
  setClipTabs,
  setActiveTabId,
  setSelectedFile,
  setVideoSrc,
}) => {
  const handleLoad = async () => {
    const data = await window.electronAPI.loadProject();
    if (!data) return alert('❌ No project file loaded.');
    if (!data.videoFilePath) return alert('❌ Missing videoFilePath in project.');

    console.log('📂 Loaded .wizard data:', data);

    setTranscript(data.transcript || []);
    setClipTabs(data.clipTabs || []);
    if (data.activeTabId) setActiveTabId(data.activeTabId);
    setSelectedFile({
      name: data.videoFileName,
      path: data.videoFilePath,
    });

    const buffer = await window.electronAPI.readFileAsBlob(data.videoFilePath);
    const blob = new Blob([buffer], { type: 'video/mp4' });
    const videoURL = URL.createObjectURL(blob);
    setVideoSrc(videoURL);
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button onClick={handleLoad}>📂 Load Project</button>
    </div>
  );
};

export default ProjectControls;
