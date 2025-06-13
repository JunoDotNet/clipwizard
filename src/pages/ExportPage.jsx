import React from 'react';
import { useAppContext } from '../context/AppContext';
import ExportControls from '../components/ExportControls';

const ExportPage = () => {
  const {
    selectedFile,
    transcript,
    setTranscript,
    setSelectedFile,
    videoSrc,
    setVideoSrc,
    clipTabs,
    setClipTabs,
    activeTabId,
    setActiveTabId
  } = useAppContext();

  return (
    <div style={{ padding: 20 }}>
      <h2>📤 Export</h2>
      <ExportControls
        selectedFile={selectedFile}
        transcript={transcript}
        setTranscript={setTranscript}
        setSelectedFile={setSelectedFile}
        setVideoSrc={setVideoSrc}
        clipTabs={clipTabs}
        setClipTabs={setClipTabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
      />
    </div>
  );
};

export default ExportPage;
