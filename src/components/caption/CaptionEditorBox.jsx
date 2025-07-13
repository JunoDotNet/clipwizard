import React, { useRef, useState, useEffect } from 'react';

const CaptionEditorBox = ({ box, scale, onUpdate, id, canvasSize }) => {
  const boxRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [startPos, setStartPos] = useState(null);

  const handleMouseDownDrag = (e) => {
    e.stopPropagation();
    setDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseDownResize = (e) => {
    e.stopPropagation();
    setResizing(true);
    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!startPos || (!dragging && !resizing)) return;

    const dx = (e.clientX - startPos.x) / scale;
    const dy = (e.clientY - startPos.y) / scale;

    const maxX = canvasSize.width - box.width;
    const maxY = canvasSize.height - box.height;

    if (dragging) {
      const newX = Math.max(0, Math.min(box.x + dx, maxX));
      const newY = Math.max(0, Math.min(box.y + dy, maxY));
      onUpdate(id, { ...box, x: newX, y: newY });
    }

    if (resizing) {
      const newWidth = box.width + dx;
      const newHeight = box.height + dy;
      const clampedWidth = Math.max(20, Math.min(newWidth, canvasSize.width - box.x));
      const clampedHeight = Math.max(20, Math.min(newHeight, canvasSize.height - box.y));
      onUpdate(id, { ...box, width: clampedWidth, height: clampedHeight });
    }

    setStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setDragging(false);
    setResizing(false);
    setStartPos(null);
  };

  // Attach document-level mouse events when dragging or resizing
  useEffect(() => {
    if (dragging || resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, resizing, handleMouseMove, handleMouseUp]);

  return (
    <div
        ref={boxRef}
        style={{
        position: 'absolute',
        left: box.x * scale,
        top: box.y * scale,
        width: box.width * scale,
        height: box.height * scale,
        border: '2px solid #09f',
        backgroundColor: 'rgba(0,136,255,0.05)',
        zIndex: 3,
        cursor: dragging ? 'grabbing' : 'move',
        }}
        onMouseDown={handleMouseDownDrag}
    >
        <textarea
        value={box.text || ''}
        onChange={(e) => onUpdate(id, { ...box, text: e.target.value })}
        style={{
            width: '100%',
            height: '100%',
            resize: 'none',
            border: 'none',
            background: 'transparent',
            color: 'white',
            fontSize: 16,
            fontFamily: 'Arial, sans-serif',
            outline: 'none',
            padding: 4,
            boxSizing: 'border-box',
        }}
        />

        {/* Resize handle */}
        <div
        onMouseDown={handleMouseDownResize}
        style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 10,
            height: 10,
            background: '#09f',
            cursor: 'nwse-resize',
        }}
        />
    </div>
    );

};

export default CaptionEditorBox;
