import React, { useRef, useState, useEffect } from 'react';
import FilePicker from './components/FilePicker';
import VideoPlayer from './components/VideoPlayer';
import useClipPlayback from './hooks/useClipPlayback';
import useTranscription from './hooks/useTranscription';
import ClipTabs from './components/ClipTabs';
import TranscriptPanel from './components/TranscriptPanel';
import ExportControls from './components/ExportControls';
import ProjectControls from './components/ProjectControls';
import AITranscriptImporter from './components/AITranscriptImporter';


const App = () => {
  const videoRef = useRef();
  const [videoSrc, setVideoSrc] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [clipTabs, setClipTabs] = useState([{ id: 'tab-1', name: 'Cut 1', clips: [] }]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [selectedFile, setSelectedFile] = useState(null);
  const { transcribe, transcription } = useTranscription();
  const { playClips } = useClipPlayback(videoRef);

  const activeTab = clipTabs.find(tab => tab.id === activeTabId);

  const updateActiveTabClips = (updater) => {
    setClipTabs(prev =>
      prev.map(tab =>
        tab.id === activeTabId ? { ...tab, clips: updater(tab.clips) } : tab
      )
    );
  };

  useEffect(() => {
    if (transcription) {
      const parseTime = (t) => {
        const parts = t.replace(',', '.').split(':');
        return parts.length === 3 ? (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]) : 0;
      };
      const parsed = (transcription.transcription || []).map((seg, i) => ({
        ...seg,
        id: i,
        start: parseTime(seg.timestamps?.from),
        end: parseTime(seg.timestamps?.to),
      }));
      setTranscript(parsed);
    }
  }, [transcription]);

  const handleFileSelected = (url, file) => {
    setVideoSrc(url);
    setSelectedFile(file);
    transcribe(file);
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


    const matchedClips = clipArray.map((importedClip) => {
      const match = transcript.find(
        (t) =>
          Math.round(t.start) === Math.round(importedClip.start) &&
          Math.round(t.end) === Math.round(importedClip.end) &&
          t.text.trim() === importedClip.text.trim()
      );

      if (match) {
        return {
          ...match,
          startOffset: 0,
          endOffset: 0,
        };
      } else {
        console.warn('⚠️ Could not match imported clip to transcript:', importedClip);
        return null;
      }
    }).filter(Boolean);

    setClipTabs((prev) => [...prev, { id: newId, name: tabName, clips: matchedClips }]);
    setActiveTabId(newId);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🧙 ClipWizard</h1>

      {/* Always visible */}
      <FilePicker onFileSelected={handleFileSelected} />
      <ProjectControls
        setTranscript={setTranscript}
        setClipTabs={setClipTabs}
        setActiveTabId={setActiveTabId}
        setSelectedFile={setSelectedFile}
        setVideoSrc={setVideoSrc}
      />
      <VideoPlayer src={videoSrc} videoRef={videoRef} />
      
      {transcript.length > 0 && (
        <>
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

          <ExportControls
            selectedFile={selectedFile}
            transcript={transcript}
            clipTabs={clipTabs}
            activeTabId={activeTabId}
          />

          <AITranscriptImporter
            onImport={(clips, tabName) => {
              importAIClipSet(clips, tabName);
            }}
          />


        </>
      )}
    </div>
  );
};

export default App;
