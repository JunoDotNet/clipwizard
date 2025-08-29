import React from 'react';
import { useAppContext } from '../../context/AppContext';

const formatTime = (time) => Number.isFinite(time) ? Math.round(time) : 0;

const TranscriptList = ({
  transcript,
  selectedIds = [],
  toggleId = () => {},
  jumpTo = () => {},
  onClickLine = null,
  highlightedSections = [],
  activeLabelId = null // Add this prop to know when we're in highlight mode
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
    <div style={{ 
      height: '100%', 
      overflowY: 'auto', 
      padding: `var(--scaled-spacing-base, 10px)`,
      fontSize: `var(--scaled-font-base, 14px)`
    }}>
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
                fontSize: `var(--scaled-font-xs, 10px)`,
                backgroundColor: marker.label.color,
                color: '#000',
                borderRadius: `var(--scaled-border-radius, 4px)`,
                padding: `var(--scaled-spacing-xs, 2px) var(--scaled-spacing-xs, 6px)`,
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
              }}
            >
              {marker.label.name}
            </span>
          ) : null;

        return (
          <div
            key={line.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: `var(--scaled-spacing-xs, 4px)`,
              background,
              padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 6px)`,
              borderRadius: `var(--scaled-border-radius, 4px)`,
              cursor: onClickLine ? 'pointer' : 'default',
            }}
            onClick={() => {
              console.log('🖱️ Transcript line clicked:', line.id, line);
              console.log('🖱️ Line start time:', line.start, 'jumpTo function:', jumpTo);
              console.log('🖱️ activeLabelId:', activeLabelId, 'onClickLine:', !!onClickLine);
              
              // If actively highlighting (activeLabelId is set), prioritize highlighting over autoplay
              if (onClickLine && activeLabelId) {
                console.log('🎯 In highlight mode, blocking autoplay');
                onClickLine(line.id);
                return; // Exit early, don't trigger autoplay when actively highlighting
              }
              
              // Otherwise do autoplay (whether highlighted or not)
              if (typeof line.start === 'number' && line.start >= 0) {
                jumpTo(line.start);
                console.log('🎬 Jumping to time:', line.start);
                
                // Auto-play from this timestamp
                setTimeout(() => {
                  const video = document.querySelector('video');
                  if (video) {
                    video.currentTime = line.start;
                    video.play().then(() => {
                      console.log('▶️ Auto-playing from:', line.start);
                    }).catch(err => {
                      console.log('❌ Auto-play failed:', err);
                    });
                  }
                }, 100); // Small delay to ensure currentTime is set
              }
            }}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              {toggleId && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleId(line.id);
                  }}
                  style={{ marginRight: `var(--scaled-spacing-sm, 8px)` }}
                />
              )}
              <span
                style={{ 
                  color: '#0077cc',
                  fontSize: `var(--scaled-font-sm, 12px)`,
                  userSelect: 'none'
                }}
              >
                [{formatTime(line.start)}s–{formatTime(line.end)}s] {line.text}
              </span>
            </div>

            {rightTag && <div style={{ marginLeft: `var(--scaled-spacing-base, 12px)` }}>{rightTag}</div>}
          </div>
        );
      })}
    </div>
  );
};

export default TranscriptList;
