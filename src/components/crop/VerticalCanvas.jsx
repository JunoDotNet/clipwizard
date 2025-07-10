import React, { useEffect, useRef, useState } from 'react';

const VerticalCanvas = ({ canvasSize, displaySize, layers, videoRef, activeCrop, captionData = {} }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef();
  const [customFontLoaded, setCustomFontLoaded] = useState(false);
  const [customFontFamily, setCustomFontFamily] = useState('');

  // Load custom font when captionData changes
  useEffect(() => {
    const { fontFamily, customFontPath } = captionData;
    if (fontFamily === 'custom' && customFontPath) {
      const loadCustomFont = async () => {
        try {
          const fontFileName = customFontPath.split('\\').pop() || customFontPath.split('/').pop();
          const fontName = `CustomFont_${fontFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')}`;
          
          const result = await window.electronAPI.readFontFile(customFontPath);
          if (!result.success) {
            throw new Error(result.error);
          }
          
          const extension = fontFileName.split('.').pop().toLowerCase();
          let format = 'truetype';
          if (extension === 'otf') format = 'opentype';
          else if (extension === 'woff') format = 'woff';
          else if (extension === 'woff2') format = 'woff2';
          
          const fontFace = new FontFace(fontName, `url(data:font/${format};base64,${result.data})`);
          await fontFace.load();
          document.fonts.add(fontFace);
          
          setCustomFontFamily(fontName);
          setCustomFontLoaded(true);
        } catch (error) {
          console.warn('Could not load custom font for canvas:', error);
          setCustomFontLoaded(false);
          setCustomFontFamily('');
        }
      };
      loadCustomFont();
    } else {
      setCustomFontLoaded(false);
      setCustomFontFamily('');
    }
  }, [captionData.fontFamily, captionData.customFontPath]);

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

    // Draw caption overlay if present
    if (captionData.text && captionData.text.trim()) {
      const { text, fontSize = 24, fontFamily = 'Arial', customFontPath, fontColor = '#ffffff' } = captionData;
      
      ctx.save();
      
      // Determine which font to use
      let canvasFont = fontFamily;
      if (fontFamily === 'custom') {
        if (customFontLoaded && customFontFamily) {
          canvasFont = customFontFamily;
        } else {
          canvasFont = 'Arial'; // Fallback
        }
      }
      
      // Set font properties
      ctx.font = `bold ${fontSize}px ${canvasFont}`;
      ctx.fillStyle = fontColor; // Use selected color
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      // Position caption at bottom center of canvas
      const x = canvasSize.height / 2;
      const lines = text.split('\n');
      const lineHeight = fontSize * 1.2; // 120% line height
      const totalHeight = lines.length * lineHeight;
      const startY = canvasSize.width - 30 - totalHeight + lineHeight; // Start position
      
      // Draw each line
      lines.forEach((line, index) => {
        const y = startY + (index * lineHeight);
        // Draw text outline (stroke) first
        ctx.strokeText(line, x, y);
        // Draw filled text on top
        ctx.fillText(line, x, y);
      });
      
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
  }, [canvasSize, layers, videoRef, activeCrop, captionData, customFontLoaded, customFontFamily]);

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
