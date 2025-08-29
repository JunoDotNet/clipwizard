import React, { useState } from 'react';

import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import SortableClipItem from './SortableClipItem';

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
        minHeight: `calc(300px * var(--app-scale, 1))`,
        backgroundColor: isOver ? '#e0ffe0' : '#f8f8f8',
        padding: `var(--scaled-spacing-base, 12px)`,
        borderRadius: `var(--scaled-border-radius, 4px)`,
        transition: 'background-color 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ 
          margin: 0,
          fontSize: `var(--scaled-font-base, 14px)`,
          color: '#333'
        }}>📋 {tabName || 'Your Cut'}</h4>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => playClips(clips)} 
            style={{ 
              fontSize: `var(--scaled-font-sm, 12px)`, 
              marginRight: `var(--scaled-spacing-xs, 4px)`,
              padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 6px)`,
              background: '#444',
              border: `var(--scaled-border-width, 1px) solid #555`,
              color: '#ddd',
              borderRadius: `var(--scaled-border-radius, 4px)`,
              cursor: 'pointer'
            }}
          >
            ▶️ Play All
          </button>
          <button 
            onClick={() => setShowSettings(prev => !prev)} 
            title="Settings" 
            style={{ 
              fontSize: `var(--scaled-font-base, 14px)`,
              padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 6px)`,
              background: '#444',
              border: `var(--scaled-border-width, 1px) solid #555`,
              color: '#ddd',
              borderRadius: `var(--scaled-border-radius, 4px)`,
              cursor: 'pointer'
            }}
          >
            ⚙️
          </button>
          {showSettings && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              background: '#fff',
              border: `var(--scaled-border-width, 1px) solid #ccc`,
              padding: `var(--scaled-spacing-sm, 8px)`,
              zIndex: 1000,
              width: `calc(250px * var(--app-scale, 1))`,
              borderRadius: `var(--scaled-border-radius, 4px)`,
              boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
            }}>
              <label style={{ 
                display: 'block', 
                marginBottom: `var(--scaled-spacing-sm, 8px)`,
                fontSize: `var(--scaled-font-sm, 12px)`,
                color: '#333'
              }}>
                ⏱️ Time Limit (seconds):
                <input
                  type="number"
                  value={timeLimit ?? ''}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  placeholder="No limit"
                  style={{ 
                    width: '100%', 
                    marginTop: `var(--scaled-spacing-xs, 4px)`,
                    padding: `var(--scaled-spacing-xs, 4px)`,
                    fontSize: `var(--scaled-font-sm, 12px)`,
                    border: `var(--scaled-border-width, 1px) solid #ccc`,
                    borderRadius: `var(--scaled-border-radius, 4px)`
                  }}
                />
              </label>
              <button 
                onClick={() => setTimeLimit(null)} 
                style={{ 
                  marginBottom: `var(--scaled-spacing-sm, 8px)`, 
                  width: '100%',
                  padding: `var(--scaled-spacing-xs, 4px)`,
                  fontSize: `var(--scaled-font-sm, 12px)`,
                  background: '#666',
                  border: `var(--scaled-border-width, 1px) solid #777`,
                  color: 'white',
                  borderRadius: `var(--scaled-border-radius, 4px)`,
                  cursor: 'pointer'
                }}
              >
                ❌ Clear Limit
              </button>
              <hr style={{ 
                margin: `var(--scaled-spacing-sm, 8px) 0`, 
                border: `var(--scaled-border-width, 1px) solid #ddd` 
              }} />
              <div style={{ marginTop: `var(--scaled-spacing-sm, 8px)` }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: `var(--scaled-spacing-xs, 4px)`, 
                  fontSize: `var(--scaled-font-sm, 12px)`,
                  color: '#333'
                }}>
                  📝 Tab Name:
                </label>
                {isRenaming ? (
                  <div style={{ 
                    display: 'flex', 
                    gap: `var(--scaled-spacing-xs, 4px)`, 
                    alignItems: 'center' 
                  }}>
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={handleRenameKeyDown}
                      placeholder="Tab name"
                      style={{ 
                        flex: 1, 
                        padding: `var(--scaled-spacing-xs, 4px)`, 
                        minWidth: 0,
                        fontSize: `var(--scaled-font-sm, 12px)`,
                        border: `var(--scaled-border-width, 1px) solid #ccc`,
                        borderRadius: `var(--scaled-border-radius, 4px)`
                      }}
                      autoFocus
                    />
                    <button
                      onClick={handleRenameSubmit}
                      style={{ 
                        background: '#4CAF50', 
                        color: 'white', 
                        border: 'none', 
                        padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 6px)`, 
                        cursor: 'pointer',
                        minWidth: `calc(28px * var(--app-scale, 1))`,
                        flexShrink: 0,
                        fontSize: `var(--scaled-font-sm, 12px)`,
                        borderRadius: `var(--scaled-border-radius, 4px)`
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
                        padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 6px)`, 
                        cursor: 'pointer',
                        minWidth: `calc(28px * var(--app-scale, 1))`,
                        flexShrink: 0,
                        fontSize: `var(--scaled-font-sm, 12px)`,
                        borderRadius: `var(--scaled-border-radius, 4px)`
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
                      padding: `var(--scaled-spacing-sm, 8px)`, 
                      background: '#f0f0f0', 
                      border: `var(--scaled-border-width, 1px) solid #ccc`, 
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: `var(--scaled-font-sm, 12px)`,
                      borderRadius: `var(--scaled-border-radius, 4px)`
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

      <p style={{ 
        fontSize: `var(--scaled-font-sm, 12px)`, 
        color: exceedsLimit ? 'red' : '#333', 
        margin: `var(--scaled-spacing-xs, 4px) 0` 
      }}>
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
