import React from 'react';

const TranscriptList = ({
  transcript,
  selectedIds = [],
  toggleId = () => {},
  jumpTo = () => {},
  onClickLine = null,
  highlightedSections = []
}) => {
  const formatTime = (time) => Number.isFinite(time) ? Math.round(time) : 0;

  const getHighlightColor = (start, end) => {
    for (const section of highlightedSections) {
      if (end > section.startTime && start < section.endTime) {
        return section.color;
      }
    }
    return null;
  };


  return (
    <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ccc', padding: 10 }}>
      {transcript.map((line) => {
        const isSelected = selectedIds.includes(line.id);
        const background = getHighlightColor(line.start, line.end) || 'transparent';

        return (
          <label
            key={line.id}
            style={{
              display: 'block',
              marginBottom: 5,
              background,
              padding: '4px 6px',
              borderRadius: 4,
            }}
          >
            {toggleId && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleId(line.id)}
              />
            )}
            <span
              style={{ marginLeft: 8, color: '#0077cc', cursor: 'pointer' }}
              onClick={() => {
                if (!onClickLine) jumpTo(formatTime(line.start));
                onClickLine?.(line.id);
              }}
            >
              [{formatTime(line.start)}s–{formatTime(line.end)}s] {line.text}
            </span>
          </label>
        );
      })}
    </div>
  );
};

export default TranscriptList;
