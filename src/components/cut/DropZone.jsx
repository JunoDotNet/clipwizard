import React, { useState } from 'react';

import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import SortableClipItem from '../SortableClipItem';

const DropZone = ({
  clips,
  playClips,
  onSelectClip,
  selectedClipId,
  onDeleteClip,
  tabName,              
  timeLimit,
  setTimeLimit,
  onRenameTab // New prop for rename functionality
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'cut-drop-zone' });
  const [showSettings, setShowSettings] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const handleStartRename = () => {
    setIsRenaming(true);
    setRenameValue(tabName);
  };

  const handleRenameSubmit = () => {
    if (renameValue.trim() && onRenameTab) {
      onRenameTab(renameValue.trim());
    }
    setIsRenaming(false);
    setRenameValue('');
  };

  const handleRenameCancel = () => {
    setIsRenaming(false);
    setRenameValue('');
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  const totalSeconds = clips.reduce(
    (sum, c) => sum + ((c.end + (c.endOffset || 0)) - (c.start + (c.startOffset || 0))),
    0
  );
  const exceedsLimit = timeLimit && totalSeconds > timeLimit;

   return (
    <div
      ref={setNodeRef}
      id="cut-drop-zone"
      style={{
        flex: 1,
        minHeight: 300,
        backgroundColor: isOver ? '#e0ffe0' : '#f8f8f8',
        padding: 10,
        borderRadius: 6,
        transition: 'background-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>📋 {tabName || 'Your Cut'}</h4>
        <div style={{ position: 'relative' }}>
          <button onClick={() => playClips(clips)} style={{ fontSize: 12, marginRight: 6 }}>▶️ Play All</button>
          <button onClick={() => setShowSettings(prev => !prev)} title="Settings" style={{ fontSize: 14 }}>
            ⚙️
          </button>
          {showSettings && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: '#fff',
              border: '1px solid #ccc',
              padding: 8,
              zIndex: 1000,
              width: 250
            }}>
              <label style={{ display: 'block', marginBottom: 8 }}>
                ⏱️ Time Limit (seconds):
                <input
                  type="number"
                  value={timeLimit ?? ''}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  placeholder="No limit"
                  style={{ width: '100%', marginTop: 4 }}
                />
              </label>
              <button onClick={() => setTimeLimit(null)} style={{ marginBottom: 8, width: '100%' }}>
                ❌ Clear Limit
              </button>
              <hr style={{ margin: '8px 0', border: '1px solid #ddd' }} />
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'block', marginBottom: 4, fontSize: '14px' }}>
                  📝 Tab Name:
                </label>
                {isRenaming ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={handleRenameKeyDown}
                      placeholder="Tab name"
                      style={{ flex: 1, padding: 4, minWidth: 0 }}
                      autoFocus
                    />
                    <button
                      onClick={handleRenameSubmit}
                      style={{ 
                        background: '#4CAF50', 
                        color: 'white', 
                        border: 'none', 
                        padding: '6px 10px', 
                        cursor: 'pointer',
                        minWidth: '28px',
                        flexShrink: 0
                      }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleRenameCancel}
                      style={{ 
                        background: '#f44336', 
                        color: 'white', 
                        border: 'none', 
                        padding: '6px 10px', 
                        cursor: 'pointer',
                        minWidth: '28px',
                        flexShrink: 0
                      }}
                    >
                      ✗
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleStartRename}
                    style={{ 
                      width: '100%', 
                      padding: 8, 
                      background: '#f0f0f0', 
                      border: '1px solid #ccc', 
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Rename "{tabName}"
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <p style={{ fontSize: 13, color: exceedsLimit ? 'red' : '#333', margin: '6px 0' }}>
        🎬 Duration: {totalSeconds.toFixed(2)}s
        {timeLimit && ` / Limit: ${timeLimit}s`}
      </p>

      <SortableContext items={clips.map(c => c.id)} strategy={verticalListSortingStrategy}>
        {clips.map(clip => (
          <SortableClipItem
            key={clip.id}
            clip={clip}
            isSelected={clip.id === selectedClipId}
            onClick={onSelectClip}
            onDelete={onDeleteClip}
          />
        ))}
      </SortableContext>
    </div>
  );
};

export default DropZone;
