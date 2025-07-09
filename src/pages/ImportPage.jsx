import React, { useRef, useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import VideoPlayer from '../components/VideoPlayer';
import useTranscription from '../hooks/useTranscription';
import TranscriptList from '../components/TranscriptList';
import { insertHighlightSection } from '../utils/highlightUtils';
import HighlightLabelManager from '../components/HighlightLabelManager';
import WaveformPlayer from '../components/WaveformPlayer';
import AddCustomClip from '../components/AddCustomClip';
import SplashScreen from '../components/SplashScreen';

const ImportPage = () => {
  const {
    setVideoSrc, setTranscript, setClipTabs, setSelectedFile, setActiveTabId,
    videoSrc, transcript, highlightedSections, setHighlightedSections, highlightLabels,
    showSplash, setShowSplash, // <-- use from context
    clearCropData, // Add clearCropData function
  } = useAppContext();

  const { transcribe, transcription } = useTranscription();
  const videoRef = useRef();
  const [markingStartId, setMarkingStartId] = useState(null);
  const [activeLabelId, setActiveLabelId] = useState(null);
  const [audioArray, setAudioArray] = useState(null); // New state for audio data
  const [audioDuration, setAudioDuration] = useState(null);
  const [wavUrl, setWavUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelected = (url, file) => {
    setVideoSrc(url);
    setSelectedFile(file);
    setLoading(true);
    transcribe(file);
    clearCropData(); // Clear crop data when loading a new video
    // setShowSplash(false); // Moved to after transcript loads
  };

  const getLabelColor = (id) =>
    highlightLabels.find(label => label.id === id)?.color || '#ffcc00';

  useEffect(() => {
    if (transcription) {
      const parse = t => {
        const parts = t.replace(',', '.').split(':');
        return parts.length === 3 ? (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]) : 0;
      };

      // First, parse all segments with start
      const raw = (transcription.transcription || []).map((seg, i) => ({
        ...seg,
        id: i,
        start: parse(seg.timestamps?.from),
      }));

      // Then, add end to each segment
      const parsed = raw.map((seg, i, arr) => ({
        ...seg,
        end: arr[i + 1] ? arr[i + 1].start : (seg.start + 3), // fallback: +3s for last
      }));

      setTranscript(parsed);
      setShowSplash(false); // Hide splash only after transcript is ready
      setLoading(false);
    }
  }, [transcription]);

  const jumpTo = (time) => {
    if (videoRef.current && Number.isFinite(time)) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  const handleMark = (id) => {
    if (!activeLabelId) {
      alert("❗ Please select a label first.");
      return;
    }

    if (markingStartId === null) {
      setMarkingStartId(id);
    } else {
      const startLine = transcript.find(l => l.id === markingStartId);
      const endLine = transcript.find(l => l.id === id);
      if (!startLine || !endLine) return;

      const startTime = Math.min(startLine.start, endLine.start);
      const endTime = Math.max(startLine.end, endLine.end);

      const newSection = {
        startTime,
        endTime,
        color: getLabelColor(activeLabelId),
        labelId: activeLabelId,
      };


      setHighlightedSections(prev =>
        insertHighlightSection(prev, newSection)
        
      );
      console.log("🔥 Highlight added:", newSection);
      setMarkingStartId(null);
      setActiveLabelId(null); // exit highlight mode
    }
  };

  // Compute transcriptWithEnds so each segment has a start and end
  let transcriptWithEnds = Array.isArray(transcript)
    ? transcript.map((seg, i, arr) => ({
        ...seg,
        end: (typeof seg.end === 'number' && seg.end > seg.start)
          ? seg.end
          : (arr[i + 1] ? arr[i + 1].start : (audioDuration || (arr[i] ? arr[i].start + 3 : 0))),
      }))
    : [];

  // Handler to hide splash when a project is loaded from ProjectControls
  const handleProjectLoaded = () => {
    setShowSplash(false);
    setLoading(false);
  };

  const { splashMode } = useAppContext();

  return (
    <div style={{ padding: 20 }}>
      <h2>📥 Import Project</h2>

      {videoSrc && (
        <>
          <VideoPlayer src={videoSrc} videoRef={videoRef} />

          <div style={{ marginTop: 20 }}>
            <WaveformPlayer
              clips={transcriptWithEnds}
              videoRef={videoRef}
              onAudioDuration={setAudioDuration}
            />
          </div>
        </>
      )}

      {transcript.length > 0 && (
        <>
          <div style={{ display: 'flex', marginTop: 20, gap: 40 }}>
            {/* Left: Highlight Label Manager */}
            <div style={{ flex: 1 }}>
              <HighlightLabelManager setActiveLabelId={setActiveLabelId} />
              <p style={{ marginTop: 6 }}>
                {activeLabelId && markingStartId === null && (
                  <>
                    🖊️ Highlight mode: <strong>{highlightLabels.find(l => l.id === activeLabelId)?.name}</strong><br />
                    Click a transcript line to start the highlight.
                    <br />
                    <button onClick={() => setActiveLabelId(null)} style={{ marginTop: 6 }}>
                      ❌ Cancel Highlight Mode
                    </button>
                  </>
                )}

                {markingStartId !== null && (
                  <>
                    Highlight started at line <strong>{markingStartId}</strong>.<br />
                    Now click the end line to confirm.
                    <br />
                    <button onClick={() => setMarkingStartId(null)} style={{ marginTop: 6 }}>
                      ❌ Cancel Highlight
                    </button>
                  </>
                )}

                {!activeLabelId && markingStartId === null && (
                  'Click “Use” on a label to begin highlighting.'
                )}
              </p>
            </div>

            {/* Right: Transcript List */}
            <div style={{ flex: 2 }}>
              <h3>📝 Transcript</h3>
              <TranscriptList
                transcript={transcript}
                selectedIds={[]}
                toggleId={null}
                jumpTo={jumpTo}
                onClickLine={handleMark}
                highlightedSections={highlightedSections}
              />
            </div>
          </div>

          <AddCustomClip
            onAddClip={(newLine) =>
              setTranscript((prev) => [...prev, newLine].sort((a, b) => a.start - b.start))
            }
          />
        </>
      )}
      {showSplash && (
        <SplashScreen
          onFileSelected={handleFileSelected}
          loading={loading}
          setTranscript={setTranscript}
          setClipTabs={setClipTabs}
          setActiveTabId={setActiveTabId}
          setSelectedFile={setSelectedFile}
          setVideoSrc={setVideoSrc}
          setWavUrl={setWavUrl}
          onProjectLoaded={handleProjectLoaded}
          splashMode={splashMode}
        />
      )}
    </div>
  );
};

export default ImportPage;
