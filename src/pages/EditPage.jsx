import React, { useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import VideoPlayer from '../components/VideoPlayer';
import ClipTabs from '../components/ClipTabs';
import TranscriptPanel from '../components/TranscriptPanel';
import AITranscriptImporter from '../components/AITranscriptImporter';
import useClipPlayback from '../hooks/useClipPlayback';

const EditPage = () => {
  const videoRef = useRef();
  const {
    videoSrc, transcript, clipTabs, setClipTabs, activeTabId, setActiveTabId
  } = useAppContext();

  const activeTab = clipTabs.find(tab => tab.id === activeTabId);
  const { playClips } = useClipPlayback(videoRef);

  const updateActiveTabClips = (updater) => {
    setClipTabs(prev =>
      prev.map(tab =>
        tab.id === activeTabId ? { ...tab, clips: updater(tab.clips) } : tab
      )
    );
  };

  const toggleId = (id) => {
    updateActiveTabClips((clips) => {
      const exists = clips.find(c => c.id === id);
      if (exists) return clips.filter(c => c.id !== id);
      const original = transcript.find(l => l.id === id);
      return [...clips, { ...original, startOffset: 0, endOffset: 0 }];
    });
  };

  const updateClipOffset = (id, type, delta) => {
    updateActiveTabClips(clips =>
      clips.map(c =>
        c.id === id ? { ...c, [type]: +(c[type] || 0) + delta } : c
      )
    );
  };

  const jumpTo = (time) => {
    if (videoRef.current && Number.isFinite(time)) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  const renameTab = (id, name) => {
    setClipTabs(tabs => tabs.map(t => t.id === id ? { ...t, name } : t));
  };

  const deleteTab = (id) => {
    setClipTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== id);
      if (id === activeTabId && filtered.length) setActiveTabId(filtered[0].id);
      return filtered;
    });
  };

  const importAIClipSet = (clipArray, tabName = `AI Cut ${clipTabs.length + 1}`) => {
    const newId = `tab-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const matched = clipArray.map((clip) => {
      const match = transcript.find(t =>
        Math.round(t.start) === Math.round(clip.start) &&
        Math.round(t.end) === Math.round(clip.end) &&
        t.text.trim() === clip.text.trim()
      );
      return match ? { ...match, startOffset: 0, endOffset: 0 } : null;
    }).filter(Boolean);

    setClipTabs(prev => [...prev, { id: newId, name: tabName, clips: matched }]);
    setActiveTabId(newId);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>✂️ Edit Clips</h2>
      <VideoPlayer src={videoSrc} videoRef={videoRef} />

      <ClipTabs
        tabs={clipTabs}
        activeTabId={activeTabId}
        setActiveTabId={setActiveTabId}
        addTab={() => {
          const id = `tab-${Date.now()}`;
          setClipTabs(tabs => [...tabs, { id, name: `Cut ${tabs.length + 1}`, clips: [] }]);
          setActiveTabId(id);
        }}
        renameTab={renameTab}
        deleteTab={deleteTab}
      />

      <TranscriptPanel
        transcript={transcript}
        selectedClips={activeTab?.clips || []}
        toggleId={toggleId}
        jumpTo={jumpTo}
        updateClipOffset={updateClipOffset}
        playClips={playClips}
      />

      <AITranscriptImporter onImport={importAIClipSet} />
    </div>
  );
};

export default EditPage;
