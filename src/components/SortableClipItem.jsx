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
    padding: '6px 10px',
    marginBottom: 4,
    borderRadius: 4,
    border: isSelected ? '2px solid #333' : '1px solid #ccc',
    boxShadow: isSelected ? '0 0 4px rgba(0,0,0,0.3)' : 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
        {/* Clickable area */}
        <div
            onClick={(e) => {
            e.stopPropagation();
            onClick?.(clip);
            }}
            style={{ flex: 1, cursor: 'pointer', paddingRight: 8 }}
        >
            [{Math.round(clip.start)}s–{Math.round(clip.end)}s] {clip.text}
        </div>

        {/* Delete button */}
        <button
            onClick={(e) => {
            e.stopPropagation();
            onDelete?.(clip.id);
            }}
            style={{
            marginRight: 6,
            background: 'transparent',
            border: 'none',
            color: '#c00',
            cursor: 'pointer',
            fontSize: 14,
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
            fontSize: 12,
            padding: '2px 4px',
            backgroundColor: '#ccc',
            borderRadius: 4,
            userSelect: 'none',
            }}
        >
            ⠿
        </div>
        </div>
    );
    };

export default SortableClipItem;
