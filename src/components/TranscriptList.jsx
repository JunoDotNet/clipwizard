import React from 'react';

const TranscriptList = ({ transcript, selectedIds, toggleId, jumpTo }) => {
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
            onClick={() => jumpTo(line.start)}
          >
            [{line.start}s–{line.end}s] {line.text}
          </span>
        </label>
      ))}
    </div>
  );
};

export default TranscriptList;
