import React, { useRef, useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import FilePicker from '../components/FilePicker';
import ProjectControls from '../components/ProjectControls';
import VideoPlayer from '../components/VideoPlayer';
import useTranscription from '../hooks/useTranscription';
import TranscriptList from '../components/TranscriptList';
import { insertHighlightSection } from '../utils/highlightUtils';


const ImportPage = () => {
  const {
    setVideoSrc, setTranscript, setClipTabs, setSelectedFile, setActiveTabId,
    videoSrc, transcript, highlightedSections, setHighlightedSections
  } = useAppContext();


  const { transcribe, transcription } = useTranscription();
  const videoRef = useRef();
  const navigate = useNavigate();
  const [markingStartId, setMarkingStartId] = useState(null);
  const [color, setColor] = useState('#ffcc00'); // default color

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
      // Stay on page — don't navigate to /edit yet
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

  const overlaps = (aStart, aEnd, bStart, bEnd) =>
  aStart <= bEnd && aEnd >= bStart && !(aEnd === bStart || aStart === bEnd);

  const handleMark = (id) => {
    if (markingStartId === null) {
      setMarkingStartId(id);
    } else {
      const startLine = transcript.find(l => l.id === markingStartId);
      const endLine = transcript.find(l => l.id === id);
      if (!startLine || !endLine) return;

      const startTime = Math.min(startLine.start, endLine.start);
      const endTime = Math.max(startLine.end, endLine.end);

      const newSection = { startTime, endTime, color };

      setHighlightedSections(prev =>
        insertHighlightSection(prev, newSection)
      );

      setMarkingStartId(null);
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
            selectedIds={[]} // no toggles yet
            toggleId={null}
            jumpTo={jumpTo}
            onClickLine={handleMark}
            highlightedSections={highlightedSections}
          />

          <div style={{ marginTop: 10 }}>
            <label>
              <span>Section Color: </span>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={markingStartId !== null} // lock color once marking started
              />
              <span
                style={{
                  display: 'inline-block',
                  width: 20,
                  height: 20,
                  backgroundColor: color,
                  border: '1px solid #888',
                  marginLeft: 10,
                  verticalAlign: 'middle'
                }}
              />
            </label>

            <p style={{ marginTop: 6 }}>
              {markingStartId === null ? (
                'Click a transcript line to start a highlight.'
              ) : (
                <>
                  Highlight started at line <strong>{markingStartId}</strong>.<br />
                  Now click the end line to confirm.
                  <br />
                  <button onClick={() => setMarkingStartId(null)} style={{ marginTop: 6 }}>
                    ❌ Cancel Highlight
                  </button>
                </>
              )}
            </p>
          </div>

        </>
      )}
    </div>
  );
};

export default ImportPage;
