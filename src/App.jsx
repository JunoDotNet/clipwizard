import React, { useRef, useState, useEffect } from 'react';
import FilePicker from './components/FilePicker';
import VideoPlayer from './components/VideoPlayer';
import useClipPlayback from './hooks/useClipPlayback';
import useTranscription from './hooks/useTranscription';
import { Buffer } from 'buffer';
import ClipTabs from './components/ClipTabs';
import TranscriptPanel from './components/TranscriptPanel';
import ExportControls from './components/ExportControls';



const App = () => {
  const videoRef = useRef();
  const [videoSrc, setVideoSrc] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [clipTabs, setClipTabs] = useState([
    { id: 'tab-1', name: 'Cut 1', clips: [] },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const { transcribe, transcription } = useTranscription();
  const { playClips } = useClipPlayback(videoRef);
  const [selectedFile, setSelectedFile] = useState(null);

  const activeTab = clipTabs.find(tab => tab.id === activeTabId);

  const updateActiveTabClips = (updater) => {
    setClipTabs((prev) =>
      prev.map((tab) =>
        tab.id === activeTabId ? { ...tab, clips: updater(tab.clips) } : tab
      )
    );
  };


  useEffect(() => {
    if (transcription) {
      console.log('📋 Updating transcript from Whisper...');
      const parseTimeString = (timeStr) => {
        if (!timeStr || typeof timeStr !== 'string') return 0;
        const parts = timeStr.replace(',', '.').split(':');
        if (parts.length !== 3) return 0;
        const [h, m, s] = parts;
        return Number(h) * 3600 + Number(m) * 60 + Number(s);
      };

      const parsedTranscript = (transcription.transcription || []).map((seg, index) => {
        const start = parseTimeString(seg.timestamps?.from);
        const end = parseTimeString(seg.timestamps?.to);
        return { ...seg, id: index, start, end };
      });

      console.log('✅ Parsed transcript:', parsedTranscript);
      setTranscript(parsedTranscript);
    }
  }, [transcription]);

  const handleFileSelected = (url, file) => {
    console.log('📁 handleFileSelected file:', file);
    setVideoSrc(url);
    setSelectedFile(file); // ✅ store file for export
    transcribe(file);
  };

  const toggleId = (id) => {
    updateActiveTabClips((prev) => {
      const exists = prev.find((c) => c.id === id);
      if (exists) {
        return prev.filter((c) => c.id !== id);
      } else {
        const original = transcript.find((line) => line.id === id);
        return [...prev, { ...original, startOffset: 0, endOffset: 0 }];
      }
    });
  };

  const updateClipOffset = (id, type, delta) => {
    updateActiveTabClips((clips) =>
      clips.map((clip) =>
        clip.id === id
          ? { ...clip, [type]: parseFloat((clip[type] || 0) + delta) }
          : clip
      )
    );
  };
  
  const renameTab = (id, newName) => {
    setClipTabs((prev) =>
      prev.map((tab) =>
        tab.id === id ? { ...tab, name: newName } : tab
      )
    );
  };

  const deleteTab = (id) => {
    setClipTabs((prev) => {
      const newTabs = prev.filter((tab) => tab.id !== id);
      if (id === activeTabId && newTabs.length > 0) {
        setActiveTabId(newTabs[0].id);
      }
      return newTabs;
    });
  };

  
  const jumpTo = (time) => {
    if (videoRef.current && Number.isFinite(time)) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>🧙 ClipWizard</h1>
      <FilePicker onFileSelected={handleFileSelected} />
      {videoSrc && <VideoPlayer src={videoSrc} videoRef={videoRef} />}

      {transcript.length > 0 && (
        <>
          <ClipTabs
            tabs={clipTabs}
            activeTabId={activeTabId}
            setActiveTabId={setActiveTabId}
            addTab={() => {
              const newId = `tab-${Date.now()}`;
              setClipTabs((prev) => [...prev, { id: newId, name: `Cut ${prev.length + 1}`, clips: [] }]);
              setActiveTabId(newId);
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
            setSelectedFile={setSelectedFile}
            setTranscript={setTranscript}
            setVideoSrc={setVideoSrc}
            clipTabs={clipTabs}
            setClipTabs={setClipTabs}
            activeTabId={activeTabId}
            setActiveTabId={setActiveTabId}
          />
        </>
      )}
    </div>
  );
};

export default App;
