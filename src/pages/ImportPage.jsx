import React, { useRef, useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import FilePicker from '../components/FilePicker';
import ProjectControls from '../components/ProjectControls';
import VideoPlayer from '../components/VideoPlayer';
import useTranscription from '../hooks/useTranscription';
import TranscriptList from '../components/TranscriptList';
import { insertHighlightSection } from '../utils/highlightUtils';
import HighlightLabelManager from '../components/HighlightLabelManager';

const ImportPage = () => {
  const {
    setVideoSrc, setTranscript, setClipTabs, setSelectedFile, setActiveTabId,
    videoSrc, transcript, highlightedSections, setHighlightedSections, highlightLabels
  } = useAppContext();

  const { transcribe, transcription } = useTranscription();
  const videoRef = useRef();
  const [markingStartId, setMarkingStartId] = useState(null);
  const [activeLabelId, setActiveLabelId] = useState(null);

  const getLabelColor = (id) =>
    highlightLabels.find(label => label.id === id)?.color || '#ffcc00';

  useEffect(() => {
    if (transcription) {
      const parse = t => {
        const parts = t.replace(',', '.').split(':');
        return parts.length === 3 ? (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]) : 0;
      };

      const parsed = (transcription.transcription || []).map((seg, i) => ({
        ...seg,
        id: i,
        start: parse(seg.timestamps?.from),
        end: parse(seg.timestamps?.to),
      }));

      setTranscript(parsed);
    }
  }, [transcription]);

  const handleFileSelected = (url, file) => {
    setVideoSrc(url);
    setSelectedFile(file);
    transcribe(file);
  };

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

  return (
    <div style={{ padding: 20 }}>
      <h2>📥 Import Project</h2>
      <FilePicker onFileSelected={handleFileSelected} />
      <ProjectControls
        setTranscript={setTranscript}
        setClipTabs={setClipTabs}
        setActiveTabId={setActiveTabId}
        setSelectedFile={setSelectedFile}
        setVideoSrc={setVideoSrc}
      />
      {videoSrc && <VideoPlayer src={videoSrc} videoRef={videoRef} />}

      {transcript.length > 0 && (
        <>
          <h3>📝 Transcript</h3>
          <TranscriptList
            transcript={transcript}
            selectedIds={[]}
            toggleId={null}
            jumpTo={jumpTo}
            onClickLine={handleMark}
            highlightedSections={highlightedSections}
          />

          <div style={{ marginTop: 10 }}>
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
        </>
      )}
    </div>
  );
};

export default ImportPage;
