import React from 'react';
import ColorStackPreview from './ColorStackPreview';
import { useAppContext } from '../context/AppContext';

const CutTabGrid = ({ tabs, selectedIds, toggleTab, updateDescription, onPlayTab }) => {
  // ✅ Call useAppContext at the top level
  const { highlightedSections, transcript } = useAppContext();

  const getTabHighlights = (tab) =>
    highlightedSections.filter(h =>
      tab.clips.some(c =>
        h.endTime > c.start && h.startTime < c.end // overlap, not just containment
      )
    );

  const totalDuration = transcript.length
    ? Math.max(...transcript.map(t => t.end))
    : 1;

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
        const highlights = getTabHighlights(tab); // ✅ compute once here

        return (
          <div
            key={tab.id}
            onClick={() => onPlayTab?.(tab)}
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
                e.stopPropagation();
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

            {/* 🔷 Color stack preview under name */}
            <div style={{ marginLeft: 24, marginRight: 8, borderRadius: 4, overflow: 'hidden' }}>
              <ColorStackPreview
                sections={highlights}
                duration={totalDuration}
                height={6}
                mode="timeline"
                style={{ width: '100%', margin: 0, border: 'none', borderRadius: 4 }}
              />
            </div>

            <textarea
              placeholder="add description..."
              value={tab.description || ''}
              onChange={(e) => {
                e.stopPropagation();
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
