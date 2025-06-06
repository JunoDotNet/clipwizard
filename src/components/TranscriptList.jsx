import React from 'react';

const TranscriptList = ({ transcript, selectedIds, toggleId, jumpTo }) => {
  const formatTime = (time) => {
    return Number.isFinite(time) ? Math.round(time) : 0;
  };

  return (
    <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ccc', padding: 10 }}>
      {transcript.map((line) => (
        <label key={line.id} style={{ display: 'block', marginBottom: 5 }}>
          <input
            type="checkbox"
            checked={selectedIds.includes(line.id)}
            onChange={() => toggleId(line.id)}
          />
          <span
            style={{ marginLeft: 8, color: '#0077cc', cursor: 'pointer' }}
            onClick={() => jumpTo(formatTime(line.start))}
          >
            [{formatTime(line.start)}s–{formatTime(line.end)}s] {line.text}
          </span>
        </label>
      ))}
    </div>
  );
};

export default TranscriptList;
