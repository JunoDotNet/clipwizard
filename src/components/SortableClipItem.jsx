import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableClipItem = ({ clip, onClick, onDelete, isSelected }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: clip.id,
    animateLayoutChanges: () => false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: clip.__highlightColor || '#ddf',
    padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 8px)`,
    marginBottom: `var(--scaled-spacing-xs, 4px)`,
    borderRadius: `var(--scaled-border-radius, 4px)`,
    border: isSelected ? `calc(2px * var(--app-scale, 1)) solid #333` : `var(--scaled-border-width, 1px) solid #ccc`,
    boxShadow: isSelected ? '0 0 4px rgba(0,0,0,0.3)' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: `var(--scaled-font-sm, 12px)`,
  };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
        {/* Clickable area */}
        <div
            onClick={(e) => {
            e.stopPropagation();
            onClick?.(clip);
            }}
            style={{ 
              flex: 1, 
              cursor: 'pointer', 
              paddingRight: `var(--scaled-spacing-sm, 8px)`,
              fontSize: `var(--scaled-font-sm, 12px)`
            }}
        >
            {(() => {
                // Calculate adjusted times with offsets - add safety checks
                const start = typeof clip.start === 'number' ? clip.start : 0;
                const end = typeof clip.end === 'number' ? clip.end : 0;
                const adjustedStart = start + (clip.startOffset || 0);
                const adjustedEnd = end + (clip.endOffset || 0);
                const originalTime = `(${start.toFixed(1)}s-${end.toFixed(1)}s)`;
                const adjustedTime = `[${adjustedStart.toFixed(1)}s→${adjustedEnd.toFixed(1)}s]`;
                return `${originalTime}${adjustedTime} ${clip.text}`;
            })()}
        </div>

        {/* Delete button */}
        <button
            onClick={(e) => {
            e.stopPropagation();
            onDelete?.(clip.id);
            }}
            style={{
            marginRight: `var(--scaled-spacing-xs, 4px)`,
            background: 'transparent',
            border: 'none',
            color: '#c00',
            cursor: 'pointer',
            fontSize: `var(--scaled-font-sm, 12px)`,
            }}
            title="Delete clip"
        >
            🗑️
        </button>

        {/* Drag handle */}
        <div
            {...listeners}
            style={{
            cursor: 'grab',
            fontSize: `var(--scaled-font-xs, 10px)`,
            padding: `calc(2px * var(--app-scale, 1)) var(--scaled-spacing-xs, 4px)`,
            backgroundColor: '#ccc',
            borderRadius: `var(--scaled-border-radius, 4px)`,
            userSelect: 'none',
            }}
        >
            ⠿
        </div>
        </div>
    );
    };

export default SortableClipItem;
