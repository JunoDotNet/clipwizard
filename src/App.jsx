import React, { useRef, useState, useEffect } from 'react';
import FilePicker from './components/FilePicker';
import VideoPlayer from './components/VideoPlayer';
import TranscriptList from './components/TranscriptList';
import ClipEditor from './components/ClipEditor';
import useClipPlayback from './hooks/useClipPlayback';
import useTranscription from './hooks/useTranscription';
import { Buffer } from 'buffer';


const App = () => {
  const videoRef = useRef();
  const [videoSrc, setVideoSrc] = useState(null);
  const [transcript, setTranscript] = useState([]);
  const [selectedClips, setSelectedClips] = useState([]);
  const { transcribe, transcription } = useTranscription();
  const { playClips } = useClipPlayback(videoRef);
  const [selectedFile, setSelectedFile] = useState(null);


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

          <button
            onClick={async () => {
              const buffer = await selectedFile.originalFile.arrayBuffer();
              const nodeBuffer = Buffer.from(buffer);
              const path = await window.electronAPI.exportClips(
                nodeBuffer,
                selectedFile.name,
                selectedClips
              );
              if (path) alert(`✅ Exported to:\n${path}`);
            }}
            style={{ marginTop: 10 }}
          >
            🪄 Export Final Video
          </button>

          <button
            onClick={async () => {
              if (!selectedFile) return alert('No file loaded.');

              console.log('💾 selectedFile when saving:', selectedFile); // ✅ <--- Add this line

              const project = {
                videoFileName: selectedFile.name,
                videoFilePath: selectedFile.path,
                transcript,
                selectedClips,
              };
              const result = await window.electronAPI.saveProject(project);
              if (result) alert(`✅ Project saved to:\n${result}`);
            }}
            style={{ marginTop: 10 }}
          >
            💾 Save Project
          </button>

          <button
            onClick={async () => {
              const data = await window.electronAPI.loadProject();
              console.log('📂 Loaded .wizard data:', data); // ✅ log full object
              if (!data) return alert('❌ No project file loaded.');
              if (!data.videoFilePath) return alert('❌ Missing videoFilePath in project.');

              setTranscript(data.transcript || []);
              setSelectedClips(data.selectedClips || []);
              setSelectedFile({
                name: data.videoFileName,
                path: data.videoFilePath,
              });

              const buffer = await window.electronAPI.readFileAsBlob(data.videoFilePath);
              const blob = new Blob([buffer], { type: 'video/mp4' }); // or detect type from file extension
              const videoURL = URL.createObjectURL(blob);

              setVideoSrc(videoURL);
            }}
          >
            📂 Load Project
          </button>

        </>
      )}
    </div>
  );
};

export default App;
