import React, { useEffect, useRef } from 'react';

const VerticalCanvas = ({ canvasSize, displaySize, layers, videoRef, activeCrop }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef();

  // Draw function for current video frame and visible layers
  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d');
    const video = videoRef.current;
    if (!ctx || !video || video.readyState < 2) return;

    ctx.clearRect(0, 0, canvasSize.height, canvasSize.width);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasSize.height, canvasSize.width);

    // Only draw layers that are not hidden
    const visibleLayers = layers.filter(l => !l.hidden);
    const toDraw = activeCrop ? [...visibleLayers, { id: 'live', crop: activeCrop }] : visibleLayers;

    for (const layer of toDraw) {
      const { crop, transform = { x: 0, y: 0, scale: 1, rotate: 0 } } = layer;

      ctx.save();

      // Move to center of canvas plus layer's transform offset
      ctx.translate(
        canvasSize.height / 2 + transform.x,
        canvasSize.width / 2 + transform.y
      );

      // Rotate and scale the entire cropped region
      ctx.rotate((transform.rotate * Math.PI) / 180);
      ctx.scale(transform.scale, transform.scale);

      // Draw the crop centered at (0, 0)
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
    }

  };

  // Animation loop for smooth updates
  useEffect(() => {
    let running = true;
    function loop() {
      draw();
      if (running) animationRef.current = requestAnimationFrame(loop);
    }
    animationRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line
  }, [canvasSize, layers, videoRef, activeCrop]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h4>📱 Vertical Canvas</h4>
      <canvas
        ref={canvasRef}
        width={canvasSize.height}
        height={canvasSize.width}
        style={{
          width: displaySize.width,
          height: displaySize.height,
          background: '#111',
          border: '1px solid #555',
        }}
      />
    </div>
  );
};

export default VerticalCanvas;
