import React, { useRef, useState } from 'react';
import FilePicker from './components/FilePicker';
import VideoPlayer from './components/VideoPlayer';
import TranscriptList from './components/TranscriptList';
import useClipPlayback from './hooks/useClipPlayback'; // ✅ default import

// import useTranscription from './useTranscription'; // Temporarily disabled

const App = () => {
  const videoRef = useRef();
  const [videoSrc, setVideoSrc] = useState(null);

  // 👇 Dummy mock transcript for demo/playback
  const [transcript, setTranscript] = useState([
    { id: 1, start: 0, end: 5, text: 'Intro line goes here' },
    { id: 2, start: 5, end: 10, text: 'Next part of the video' },
  ]);

  const [selectedIds, setSelectedIds] = useState([]);

  const { playClips } = useClipPlayback(videoRef);

  // const { transcribeFile } = useTranscription(setTranscript); // Whisper disabled

  const handleFileSelected = (url) => {
    setVideoSrc(url);
    // transcribeFile(url); // Whisper disabled
  };

  const toggleId = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const jumpTo = (time) => {
    if (videoRef.current) {
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
            selectedIds={selectedIds}
            toggleId={toggleId}
            jumpTo={jumpTo}
          />
          <button onClick={() => {
            const clips = transcript.filter(line => selectedIds.includes(line.id));
            playClips(clips);
          }}>
            ▶️ Play Selected
          </button>
        </>
      )}
    </div>
  );
};

export default App;
