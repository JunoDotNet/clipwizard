import React, { useRef, useState, useEffect } from 'react';
import FilePicker from './components/FilePicker';
import VideoPlayer from './components/VideoPlayer';
import TranscriptList from './components/TranscriptList';
import ClipEditor from './components/ClipEditor';
import useClipPlayback from './hooks/useClipPlayback';
import useTranscription from './hooks/useTranscription';

const App = () => {
  const videoRef = useRef();
  const [videoSrc, setVideoSrc] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [selectedClips, setSelectedClips] = useState([]);
  const { transcribe, transcription } = useTranscription();
  const { playClips } = useClipPlayback(videoRef);

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
    setVideoSrc(url);
    transcribe(file);
  };

  const toggleId = (id) => {
    setSelectedClips((prev) => {
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
    setSelectedClips((prev) =>
      prev.map((clip) =>
        clip.id === id
          ? { ...clip, [type]: parseFloat((clip[type] || 0) + delta) }
          : clip
      )
    );
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
          <TranscriptList
            transcript={transcript}
            selectedIds={selectedClips.map((c) => c.id)}
            toggleId={toggleId}
            jumpTo={jumpTo}
          />

          <ClipEditor clips={selectedClips} updateClipOffset={updateClipOffset} />

          <button onClick={() => playClips(selectedClips)} style={{ marginTop: 10 }}>
            ▶️ Play Selected
          </button>
        </>
      )}
    </div>
  );
};

export default App;
