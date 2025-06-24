import React from 'react';

const CutTabGrid = ({ tabs, selectedIds, toggleTab, updateDescription, onPlayTab }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: 16,
      }}
    >
      {tabs.map((tab) => {
        const isSelected = selectedIds.includes(tab.id);

        return (
          <div
            key={tab.id}
            onClick={() => onPlayTab?.(tab)} // ✅ play when tile clicked
            style={{
              position: 'relative',
              border: '1px solid #ccc',
              borderRadius: 8,
              padding: 12,
              background: isSelected ? '#f8fcff' : '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 14,
              color: '#333',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {/* Floating checkbox */}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation(); // ✅ prevent triggering onClick
                toggleTab(tab.id);
              }}
              style={{
                position: 'absolute',
                top: 8,
                left: 8,
                transform: 'scale(1.1)',
              }}
              title="Include this cut"
            />

            <div style={{ fontWeight: 500, paddingLeft: 24 }}>{tab.name}</div>

            <textarea
              placeholder="add description..."
              value={tab.description || ''}
              onChange={(e) => {
                e.stopPropagation(); // ✅ don’t trigger play
                updateDescription(tab.id, e.target.value);
              }}
              rows={2}
              style={{
                resize: 'none',
                fontSize: 13,
                padding: 0,
                border: 'none',
                background: 'transparent',
                color: '#888',
                fontStyle: tab.description ? 'normal' : 'italic',
                borderBottom: '1px dashed #ccc',
                outline: 'none',
                paddingLeft: 24,
              }}
            />

            <div style={{ fontSize: 12, opacity: 0.6, paddingLeft: 24 }}>
              {tab.clips.length} clip{tab.clips.length !== 1 ? 's' : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CutTabGrid;
