import React, { useRef } from 'react';
import CropEditor from './CropEditor';
import CropBox from './CropBox';
import LayerTransformControls from './LayerTransformControls';

const VideoCanvas = ({
  videoPath,
  videoSize,
  displaySize,
  videoRef,
  layers,
  setLayers,
  onSelect,
  selectedId,
}) => {
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [drawStart, setDrawStart] = React.useState(null);
  const [tempBox, setTempBox] = React.useState(null);

  // Calculate scale based on consistent display width (600px * app-scale) rather than dynamic displaySize
  const appScale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-scale')) || 1;
  const consistentDisplayWidth = 600 * appScale;
  const scale = consistentDisplayWidth / videoSize.width;

  // Drawing a new crop box
  const getMouse = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  const handleMouseDown = (e) => {
    if (!isDrawing) return;
    const pos = getMouse(e);
    setDrawStart(pos);
    setTempBox(null);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !drawStart) return;
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
      const newLayer = {
        id: Date.now(),
        crop: tempBox,
        transform: {
          x: 0,
          y: 0,
          scale: 1,
          rotate: 0,
        },
      };

      setLayers((prev) => {
        const updated = [...prev, newLayer];
        console.log('🧱 New Layers:', updated);
        return updated;
      });

      // Don't automatically turn off drawing mode - let user toggle it off manually
    }

    setDrawStart(null);
    setTempBox(null);
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        ref={containerRef}
        style={{
          // Use consistent sizing like VideoPlayer instead of dynamic displaySize
          width: `calc(600px * var(--app-scale, 1))`,
          height: `calc(336px * var(--app-scale, 1))`,
          maxWidth: '100%',
          position: 'relative',
          background: '#111',
          borderRadius: `var(--scaled-border-radius, 4px)`,
          border: `var(--scaled-border-width, 1px) solid #333`,
          overflow: 'hidden'
        }}
        onMouseDown={isDrawing ? handleMouseDown : undefined}
        onMouseMove={isDrawing ? handleMouseMove : undefined}
        onMouseUp={isDrawing ? handleMouseUp : undefined}
      >
        {/* New Crop button - positioned in top-left corner */}
        <button
          onClick={() => {
            setIsDrawing(!isDrawing);
          }}
          style={{ 
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 4,
            background: isDrawing ? '#f99' : '#fff'
          }}
        >
          {isDrawing ? '❌ Cancel' : '➕ New Crop'}
        </button>
        {videoPath && (
          <video
            ref={videoRef}
            src={videoPath}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain',
              display: 'block', 
              pointerEvents: 'auto', 
              zIndex: 0,
              background: 'black'
            }}
          />
        )}

        {/* Draw temp box while dragging */}
        {tempBox && <CropBox box={tempBox} scale={scale} />}

        {/* Show all committed crop boxes as draggable CropEditors (do not filter hidden) */}
        {layers.map((layer, i) => (
          <CropEditor
            key={layer.id}
            crop={layer.crop}
            scale={scale}
            onChange={(newCrop) => {
              setLayers((prev) =>
                prev.map((l, j) => (j === i ? { ...l, crop: newCrop } : l))
              );
            }}
            containerRef={containerRef}
            videoSize={videoSize}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoCanvas;