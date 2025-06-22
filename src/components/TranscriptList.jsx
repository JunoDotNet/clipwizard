import React from 'react';
import { useAppContext } from '../context/AppContext';

const formatTime = (time) => Number.isFinite(time) ? Math.round(time) : 0;

const TranscriptList = ({
  transcript,
  selectedIds = [],
  toggleId = () => {},
  jumpTo = () => {},
  onClickLine = null,
  highlightedSections = []
}) => {
  const { highlightLabels } = useAppContext();
  const labelMap = Object.fromEntries(highlightLabels.map(l => [l.id, l]));

  const lineMarkers = {};

  for (const section of highlightedSections) {
    const label = labelMap[section.labelId];
    if (!label) continue;

    const lines = transcript.filter(
      line => line.start >= section.startTime && line.end <= section.endTime
    );

    if (lines.length === 0) continue;

    const firstId = lines[0].id;
    const lastId = lines[lines.length - 1].id;

    for (const line of lines) {
      if (line.id === firstId) {
        lineMarkers[line.id] = { type: 'top', label };
      } else if (line.id === lastId) {
        lineMarkers[line.id] = { type: 'bottom', label };
      } else {
        lineMarkers[line.id] = { type: 'middle' };
      }
    }
  }

  return (
    <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ccc', padding: 10 }}>
      {transcript.map((line) => {
        const isSelected = selectedIds.includes(line.id);
        const marker = lineMarkers[line.id];
        const background = line.__highlightColor
          || (() => {
            for (const section of highlightedSections) {
              if (
                line.start >= section.startTime &&
                line.end <= section.endTime &&
                section.labelId &&
                labelMap[section.labelId]
              ) {
                return section.color;
              }
            }
            return 'transparent';
          })();


        const rightTag =
          marker?.type === 'middle' ? (
            <span style={{ opacity: 0.4, fontWeight: 'bold' }}>|</span>
          ) : marker?.label ? (
            <span
              style={{
                fontSize: '0.75em',
                backgroundColor: marker.label.color,
                color: '#000',
                borderRadius: 4,
                padding: '2px 6px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
              }}
            >
              {marker.label.name}
            </span>
          ) : null;

        return (
          <label
            key={line.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 5,
              background,
              padding: '4px 6px',
              borderRadius: 4,
            }}
          >
            <div>
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
            </div>

            {rightTag && <div style={{ marginLeft: 12 }}>{rightTag}</div>}
          </label>
        );
      })}
    </div>
  );
};

export default TranscriptList;
