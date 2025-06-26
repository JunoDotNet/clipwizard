import React from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import SortableClipItem from './SortableClipItem';

const DropZone = ({ clips, playClips, onSelectClip, selectedClipId, onDeleteClip }) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'cut-drop-zone' });

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
      <h4 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        📋 Your Cut
        <button onClick={() => playClips(clips)} style={{ fontSize: 12 }}>▶️ Play All</button>
      </h4>

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
