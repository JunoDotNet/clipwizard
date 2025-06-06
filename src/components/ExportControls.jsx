import React from 'react';
import { Buffer } from 'buffer';

const ExportControls = ({
  selectedFile,
  transcript,
  setSelectedFile,
  setTranscript,
  setVideoSrc,
  clipTabs,
  setClipTabs,
  activeTabId,
  setActiveTabId,
}) => {
  const activeTab = clipTabs.find(tab => tab.id === activeTabId);
  const activeTabClips = activeTab?.clips || [];

  const updateActiveTabClips = (newClips) => {
    setClipTabs(prev =>
      prev.map(tab =>
        tab.id === activeTabId ? { ...tab, clips: newClips } : tab
      )
    );
  };

  const handleExport = async () => {
    if (!selectedFile?.originalFile) return alert('❌ No file loaded.');

    const buffer = await selectedFile.originalFile.arrayBuffer();
    const nodeBuffer = Buffer.from(buffer);

    const path = await window.electronAPI.exportClips(
      nodeBuffer,
      selectedFile.name,
      activeTabClips
    );

    if (path) alert(`✅ Exported to:\n${path}`);
  };

  const handleSave = async () => {
    if (!selectedFile) return alert('❌ No file loaded.');

    const project = {
        videoFileName: selectedFile.name,
        videoFilePath: selectedFile.path,
        transcript,
        clipTabs,
        activeTabId,
    };


    const result = await window.electronAPI.saveProject(project);
    if (result) alert(`✅ Project saved to:\n${result}`);
  };

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
      <button onClick={handleExport}>🪄 Export Final Video</button>
      <button onClick={handleSave} style={{ marginLeft: 10 }}>
        💾 Save Project
      </button>
      <button onClick={handleLoad} style={{ marginLeft: 10 }}>
        📂 Load Project
      </button>
    </div>
  );
};

export default ExportControls;
