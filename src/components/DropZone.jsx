import React from 'react';
import {
    defaultAnimateLayoutChanges,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const SortableClip = ({ clip }) => {
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
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      [{Math.round(clip.start)}s–{Math.round(clip.end)}s] {clip.text}
    </div>
  );
};

const DropZone = ({ clips, playClips }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'cut-drop-zone' });

  return (
    <div
      ref={setNodeRef}
      id="cut-drop-zone"
      style={{
        flex: 1,
        minHeight: 300,
        border: '2px dashed #aaa',
        backgroundColor: isOver ? '#e0ffe0' : '#f8f8f8',
        padding: 10,
        borderRadius: 6,
        transition: 'background-color 0.2s ease',
      }}
    >
      <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        📋 Your Cut
        <button onClick={() => playClips(clips)} style={{ fontSize: 12 }}>▶️ Play All</button>
      </h4>

      <SortableContext items={clips.map(c => c.id)} strategy={verticalListSortingStrategy}>
        {clips.map(clip => (
          <SortableClip key={clip.id} clip={clip} />
        ))}
      </SortableContext>
    </div>
  );
};

export default DropZone;
