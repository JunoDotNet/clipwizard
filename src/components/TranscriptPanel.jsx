import React from 'react';
import TranscriptList from './TranscriptList';
import ClipEditor from './ClipEditor';

const TranscriptPanel = ({
  transcript,
  selectedClips,
  toggleId,
  jumpTo,
  updateClipOffset,
  playClips,
}) => {
  return (
    <>
      <TranscriptList
        transcript={transcript}
        selectedIds={selectedClips.map((c) => c.id)}
        toggleId={toggleId}
        jumpTo={jumpTo}
      />

      <ClipEditor clips={selectedClips} updateClipOffset={updateClipOffset} />

      <button
        onClick={() => playClips(selectedClips)}
        style={{ marginTop: 10 }}
      >
        ▶️ Play Selected
      </button>
    </>
  );
};

export default TranscriptPanel;
