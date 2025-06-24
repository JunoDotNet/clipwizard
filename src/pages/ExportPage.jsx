import React, { useRef, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import VideoPlayer from '../components/VideoPlayer';
import ExportControls from '../components/ExportControls';
import CutTabGrid from '../components/CutTabGrid';
import useClipPlayback from '../hooks/useClipPlayback';
import SelectedCutList from '../components/SelectedCutList';


const ExportPage = () => {
  const {
    selectedFile,
    transcript,
    videoSrc,
    clipTabs,
    setClipTabs,
    activeTabId,
  } = useAppContext();

  const [selectedTabIds, setSelectedTabIds] = useState(clipTabs.map(t => t.id));
  const videoRef = useRef();
  const { playClips } = useClipPlayback(videoRef); // ✅ get playback control

  const toggleTab = (id) => {
    setSelectedTabIds(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const updateDescription = (id, newText) => {
    setClipTabs(prev =>
      prev.map(tab =>
        tab.id === id ? { ...tab, description: newText } : tab
      )
    );
  };

  const filteredTabs = clipTabs.filter(tab => selectedTabIds.includes(tab.id));

  return (
    <div style={{ display: 'flex', padding: 20, gap: 20 }}>
      <div style={{ flex: 1 }}>
        <h2>📤 Export</h2>
        <VideoPlayer src={videoSrc} videoRef={videoRef} />
        <h3 style={{ marginTop: 20 }}>🎞 Select Cuts to Include</h3>
        <CutTabGrid
          tabs={clipTabs}
          selectedIds={selectedTabIds}
          toggleTab={toggleTab}
          updateDescription={updateDescription}
          onPlayTab={(tab) => playClips(tab.clips)} 
        />
      </div>

      <div style={{
        width: 280,
        flexShrink: 0,
        paddingLeft: 20,
        borderLeft: '1px solid #ccc',
        background: '#f9f9f9'
      }}>
        <SelectedCutList
          tabs={clipTabs}
          selectedIds={selectedTabIds}
          toggleTab={toggleTab}
        />
        
        <div style={{ marginTop: 20 }}>
          <ExportControls
            selectedFile={selectedFile}
            transcript={transcript}
            clipTabs={filteredTabs}
            selectedTabIds={selectedTabIds}
          />
        </div>
      </div>
    </div>
  );
};

export default ExportPage;
