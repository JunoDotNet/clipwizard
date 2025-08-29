import React from 'react';
import { useDraggable } from '@dnd-kit/core';

const TranscriptDragSource = ({ line, alreadyAddedIds = [], isOverlay = false }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: line.id,
    data: { line },
    disabled: isOverlay,
  });

  const isUsed = alreadyAddedIds.includes(line.id) || (line.originalId && alreadyAddedIds.includes(line.originalId));
  const style = {
    transform: transform && !isOverlay
      ? `translate(${transform.x}px, ${transform.y}px)`
      : undefined,
    backgroundColor: line.__highlightColor || '#eee',
    padding: `var(--scaled-spacing-xs, 4px) var(--scaled-spacing-sm, 8px)`,
    marginBottom: `var(--scaled-spacing-xs, 4px)`,
    borderRadius: `var(--scaled-border-radius, 4px)`,
    fontSize: `var(--scaled-font-sm, 12px)`,
    cursor: 'grab',
    userSelect: 'none',
    pointerEvents: 'auto',
    zIndex: isOverlay ? 9999 : 'auto',
    boxShadow: isOverlay ? '0 4px 12px rgba(0,0,0,0.2)' : undefined,
    opacity: isUsed ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      {...(isOverlay ? {} : listeners)}
      {...(isOverlay ? {} : attributes)}
      style={style}
    >
      [{Math.round(line.start)}s–{Math.round(line.end)}s] {line.text}
    </div>
  );
};

export default TranscriptDragSource;
