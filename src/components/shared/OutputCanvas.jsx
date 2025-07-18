import React, { useEffect, useRef, useState } from 'react';
import CaptionEditorBox from '../caption/CaptionEditorBox';
import { drawWrappedText } from '../../utils/drawWrappedText';
import { useAppContext } from '../../context/AppContext';

const OutputCanvas = ({
  videoRef,
  displaySize,
  videoSize,
  cropLayers = [],
  captionLayers = [],
  activeCrop = null,
  captionData = {},
  // Caption editing props
  onNewLayer,
  onUpdateLayers,
  initialText = '',
  enableCaptionEditing = false,
  showResolutionSelector = false,
}) => {
  const { 
    outputFormat, setOutputFormat, 
    customResolution, setCustomResolution, 
    formatPresets, 
    getOutputResolution 
  } = useAppContext();
  const safeCaptionLayers = Array.isArray(captionLayers) ? captionLayers : [];
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef();
  
  // Caption editing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [tempBox, setTempBox] = useState(null);
  
  // Custom font state
  const [customFontLoaded, setCustomFontLoaded] = useState(false);
  const [customFontFamily, setCustomFontFamily] = useState('');

  // Canvas dimensions - using selected output resolution
  const outputRes = getOutputResolution();
  const canvasSize = {
    width: outputRes.width,
    height: outputRes.height,
  };

  // Calculate display size based on output resolution while maintaining reasonable UI scale
  const maxDisplayWidth = 400; // Maximum width for the canvas display
  const aspectRatio = canvasSize.height / canvasSize.width;
  const displayWidth = Math.min(maxDisplayWidth, canvasSize.width);
  const dynamicDisplaySize = {
    width: displayWidth,
    height: displayWidth * aspectRatio,
  };

  const scale = dynamicDisplaySize.width / canvasSize.width;

  // Mouse handling for caption editing
  const getMouse = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

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

  // Main draw function combining crop and caption rendering
  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d');
    const video = videoRef.current;
    if (!ctx || !video || video.readyState < 2) return;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw crop layers
    const visibleCropLayers = cropLayers.filter(l => !l.hidden);
    const toDraw = activeCrop ? [...visibleCropLayers, { id: 'live', crop: activeCrop }] : visibleCropLayers;

    for (const layer of toDraw) {
      const { crop, transform = { x: 0, y: 0, scale: 1, rotate: 0 } } = layer;

      ctx.save();

      // Move to center of canvas plus layer's transform offset
      ctx.translate(
        canvasSize.width / 2 + transform.x,
        canvasSize.height / 2 + transform.y
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

    // Draw caption layers
    safeCaptionLayers.forEach(layer => {
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

    // Draw caption overlay from captionData
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
      ctx.fillStyle = fontColor;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      
      // Position caption at bottom center of canvas
      const x = canvasSize.width / 2;
      const lines = text.split('\n');
      const lineHeight = fontSize * 1.2;
      const totalHeight = lines.length * lineHeight;
      const startY = canvasSize.height - 30 - totalHeight + lineHeight;
      
      // Draw each line
      lines.forEach((line, index) => {
        const y = startY + (index * lineHeight);
        ctx.strokeText(line, x, y);
        ctx.fillText(line, x, y);
      });
      
      ctx.restore();
    }
  };

  // Animation loop
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
  }, [canvasSize, cropLayers, videoRef, activeCrop, captionData, customFontLoaded, customFontFamily, safeCaptionLayers]);

  // Caption editing handlers
  const handleMouseDown = (e) => {
    if (!enableCaptionEditing) return;
    const pos = getMouse(e);
    setDrawStart(pos);
    setTempBox(null);
  };

  const handleMouseMove = (e) => {
    if (!enableCaptionEditing || !drawStart) return;
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
    if (!enableCaptionEditing) return;
    if (tempBox && tempBox.width > 10 && tempBox.height > 10) {
      onNewLayer({
        id: `caption-${Date.now()}`,
        text: initialText,
        box: tempBox,
        hidden: false,
      });
    }
    setDrawStart(null);
    setTempBox(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h4>📱 Output Canvas</h4>
      
      {/* Resolution Selector */}
      {showResolutionSelector && (
        <div style={{ 
          background: '#2a2a2a', 
          padding: '15px', 
          borderRadius: '8px',
          border: '1px solid #444',
          marginBottom: '15px',
          width: dynamicDisplaySize.width
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '14px' }}>📐 Output Resolution</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '4px',
                border: '1px solid #555',
                background: '#1a1a1a',
                color: '#fff',
                fontSize: '12px',
                minWidth: '200px'
              }}
            >
              {Object.entries(formatPresets).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.name} ({preset.width}×{preset.height})
                </option>
              ))}
            </select>
            
            {outputFormat === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  placeholder="Width"
                  value={customResolution.width}
                  onChange={(e) => setCustomResolution(prev => ({ ...prev, width: parseInt(e.target.value) || 1920 }))}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #555',
                    background: '#1a1a1a',
                    color: '#fff',
                    width: '70px',
                    fontSize: '12px'
                  }}
                />
                <span style={{ color: '#ccc', fontSize: '12px' }}>×</span>
                <input
                  type="number"
                  placeholder="Height"
                  value={customResolution.height}
                  onChange={(e) => setCustomResolution(prev => ({ ...prev, height: parseInt(e.target.value) || 1080 }))}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #555',
                    background: '#1a1a1a',
                    color: '#fff',
                    width: '70px',
                    fontSize: '12px'
                  }}
                />
              </div>
            )}
            
            <div style={{ 
              color: '#888', 
              fontSize: '11px',
              marginLeft: 'auto' 
            }}>
              Current: {canvasSize.width}×{canvasSize.height}
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          width: dynamicDisplaySize.width,
          height: dynamicDisplaySize.height,
          position: 'relative',
          background: '#111',
          border: '1px solid #555',
        }}
        onMouseDown={enableCaptionEditing && isDrawing ? handleMouseDown : undefined}
        onMouseMove={enableCaptionEditing && isDrawing ? handleMouseMove : undefined}
        onMouseUp={enableCaptionEditing && isDrawing ? handleMouseUp : undefined}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{
            width: dynamicDisplaySize.width,
            height: dynamicDisplaySize.height,
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 0,
          }}
        />

        {/* Temporary box when drawing captions */}
        {enableCaptionEditing && tempBox && (
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

        {/* Caption editor boxes */}
        {enableCaptionEditing && safeCaptionLayers.map((layer) => (
          <CaptionEditorBox
            key={layer.id}
            id={layer.id}
            box={{ ...layer.box, text: layer.text }}
            scale={scale}
            canvasSize={canvasSize}
            onUpdate={(id, newBox) => {
              const updated = safeCaptionLayers.map((l) =>
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

        {/* Caption editing toggle button */}
        {enableCaptionEditing && (
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
        )}
      </div>
    </div>
  );
};

export default OutputCanvas;
