import React, { useEffect, useRef, useState } from 'react';
import CaptionEditorBox from './CaptionEditorBox';
import { drawWrappedText } from '../../utils/drawWrappedText';

const CaptionDrawingCanvas = ({
  videoRef,
  displaySize,
  videoSize,
  cropLayers = [],
  layers = [],
  onNewLayer,
  onUpdateLayers,
  initialText = '', 
}) => {
  const safeLayers = Array.isArray(layers) ? layers : [];
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [tempBox, setTempBox] = useState(null);

  const canvasSize = {
    width: videoSize.height,
    height: videoSize.width,
  };

  const scale = displaySize.width / canvasSize.width;

  const getMouse = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

        cropLayers
          .filter(l => !l.hidden)
          .forEach(layer => {
            const { crop, transform = { x: 0, y: 0, scale: 1, rotate: 0 } } = layer;
            ctx.save();
            ctx.translate(canvasSize.width / 2 + transform.x, canvasSize.height / 2 + transform.y);
            ctx.rotate((transform.rotate * Math.PI) / 180);
            ctx.scale(transform.scale, transform.scale);
            ctx.drawImage(
              video,
              crop.x,
              crop.y,
              crop.width,
              crop.height,
              -crop.width / 2,
              -crop.height / 2,
              crop.width,
              crop.height
            );
            ctx.restore();
          });
      }
    };

    video.addEventListener('canplay', handleCanPlay);
    return () => video.removeEventListener('canplay', handleCanPlay);
  }, [videoRef, canvasSize, cropLayers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    let running = true;

    const draw = () => {
      if (!ctx || !video || video.readyState < 2) return;

      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      cropLayers.filter(l => !l.hidden).forEach(layer => {
        const { crop, transform = { x: 0, y: 0, scale: 1, rotate: 0 } } = layer;
        ctx.save();
        ctx.translate(canvasSize.width / 2 + transform.x, canvasSize.height / 2 + transform.y);
        ctx.rotate((transform.rotate * Math.PI) / 180);
        ctx.scale(transform.scale, transform.scale);
        ctx.drawImage(
          video,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          -crop.width / 2,
          -crop.height / 2,
          crop.width,
          crop.height
        );
        ctx.restore();
      });

      // ✅ Draw caption text
      safeLayers.forEach(layer => {
        if (layer.hidden) return;
        const { box, text = '', color = 'white', fontFamily = 'Arial', customFontName, textAlign = 'left' } = layer;
        
        // Use custom font name if fontFamily is 'custom' and customFontName is provided
        const actualFont = fontFamily === 'custom' && customFontName ? customFontName : fontFamily;
        
        drawWrappedText(ctx, text, box, {
          font: actualFont,
          color: color,
          lineHeight: 1.2,
          align: textAlign,
          padding: 6,
        });
      });

      if (running) requestAnimationFrame(draw);
    };

    requestAnimationFrame(draw);
    return () => {
      running = false;
    };
  }, [canvasSize, cropLayers, videoRef, safeLayers]);

  const handleMouseDown = (e) => {
    const pos = getMouse(e);
    setDrawStart(pos);
    setTempBox(null);
  };

  const handleMouseMove = (e) => {
    if (!drawStart) return;
    const current = getMouse(e);
    const box = {
      x: Math.min(drawStart.x, current.x),
      y: Math.min(drawStart.y, current.y),
      width: Math.abs(drawStart.x - current.x),
      height: Math.abs(drawStart.y - current.y),
    };
    setTempBox(box);
  };

  const handleMouseUp = () => {
    if (tempBox && tempBox.width > 10 && tempBox.height > 10) {
      onNewLayer({
        id: `caption-${Date.now()}`,
        text: initialText, // ✅ use clip text here
        box: tempBox,
        hidden: false,
      });
    }
    setDrawStart(null);
    setTempBox(null);
  };


  return (
    <div
      ref={containerRef}
      style={{
        width: displaySize.width,
        height: displaySize.height,
        position: 'relative',
        background: '#111',
        border: '1px solid #555',
      }}
      onMouseDown={isDrawing ? handleMouseDown : undefined}
      onMouseMove={isDrawing ? handleMouseMove : undefined}
      onMouseUp={isDrawing ? handleMouseUp : undefined}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          width: displaySize.width,
          height: displaySize.height,
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 0,
        }}
      />

      {tempBox && (
        <div
          style={{
            position: 'absolute',
            left: tempBox.x * scale,
            top: tempBox.y * scale,
            width: tempBox.width * scale,
            height: tempBox.height * scale,
            border: '2px dashed #0f0',
            backgroundColor: 'rgba(0,255,0,0.1)',
            zIndex: 2,
          }}
        />
      )}

      {safeLayers.map((layer) => (
        <CaptionEditorBox
          key={layer.id}
          id={layer.id}
          box={{ ...layer.box, text: layer.text }}
          scale={scale}
          canvasSize={canvasSize}
          onUpdate={(id, newBox) => {
            const updated = safeLayers.map((l) =>
              l.id === id
                ? {
                    ...l,
                    box: {
                      x: newBox.x,
                      y: newBox.y,
                      width: newBox.width,
                      height: newBox.height,
                    },
                    text: newBox.text,
                  }
                : l
            );
            if (onUpdateLayers) onUpdateLayers(updated);
          }}
        />
      ))}

      <button
        onClick={() => setIsDrawing((prev) => !prev)}
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 4,
          background: isDrawing ? '#f99' : '#fff',
        }}
      >
        {isDrawing ? '❌ Cancel' : '➕ New Caption'}
      </button>
    </div>
  );
};

export default CaptionDrawingCanvas;
