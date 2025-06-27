import React from 'react';

const ColorStackPreview = ({
  sections = [],
  duration = 1,
  height = 10,
  mode = 'timeline',
  style = {},
}) => {
  const containerStyle = {
    position: 'relative',
    width: '100%',
    height,
    border: '1px solid #ccc',
    background: '#f4f4f4',
    overflow: 'hidden',
    display: 'flex',
    ...style,
  };

  const renderBlocks = () => {
    if (!sections.length || duration <= 0) return null;

    if (mode === 'timeline') {
      return sections.map((s, i) => {
        const left = `${(s.startTime / duration) * 100}%`;
        const width = `${((s.endTime - s.startTime) / duration) * 100}%`;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left,
              width,
              top: 0,
              bottom: 0,
              backgroundColor: s.color,
              opacity: 0.9,
            }}
            title={`${s.labelId} | ${s.startTime.toFixed(2)}s – ${s.endTime.toFixed(2)}s`}
          />
        );
      });
    }

    return sections.map((s, i) => (
      <div
        key={i}
        style={{
          height: '100%',
          width: `${100 / sections.length}%`,
          backgroundColor: s.color,
          opacity: 0.9,
        }}
        title={`${s.labelId} | ${s.startTime.toFixed(2)}s – ${s.endTime.toFixed(2)}s`}
      />
    ));
  };

  return <div style={containerStyle}>{renderBlocks()}</div>;
};

export default ColorStackPreview;
