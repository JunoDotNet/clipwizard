// src/main/exportClips.js
console.log('📦 exportClips.js loaded');

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');

function writeBufferToFile(buffer, fileName, outputDir) {
  const ext = path.extname(fileName);
  const inputPath = path.join(outputDir, `input-${uuidv4()}${ext}`);
  fs.writeFileSync(inputPath, buffer);
  return inputPath;
}

function cutClip(inputPath, start, duration, outPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(start)
      .setDuration(duration)
      .videoCodec('libx264')                     // ✅ re-encode video
      .audioCodec('aac')                         // ✅ re-encode audio for sync
      .outputOptions('-preset', 'ultrafast')     // ✅ speeds up export (optional)
      .output(outPath)
      .on('end', () => resolve(outPath))
      .on('error', reject)
      .run();
  });
}


function concatClips(clipPaths, finalPath) {
  const listPath = finalPath.replace(/\.mp4$/, '_list.txt');
  fs.writeFileSync(listPath, clipPaths.map(p => `file '${p}'`).join('\n'));

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(listPath)
      .inputOptions('-f', 'concat', '-safe', '0')
      .outputOptions('-c', 'copy')
      .output(finalPath)
      .on('end', () => resolve(finalPath))
      .on('error', reject)
      .run();
  });
}

function cutClipWithEffects(inputPath, clip, outPath, videoResolution, outputResolution) {
  return new Promise((resolve, reject) => {
    const { adjustedStart, adjustedEnd, cropData = [], captionData = {} } = clip;
    const duration = Math.max(0, adjustedEnd - adjustedStart);
    
    let command = ffmpeg(inputPath)
      .setStartTime(adjustedStart)
      .setDuration(duration);

    // Use the selected output resolution directly
    const outputWidth = outputResolution.width;
    const outputHeight = outputResolution.height;
    
    // Check if we have active crops
    const hasActiveCrops = cropData.length > 0;

    // Build complex filter string
    let filterComplex = [];
    let currentStream = '[0:v]';

    // Apply crop if present
    if (hasActiveCrops) {
      // Create vertical canvas background first
      filterComplex.push(
        `color=black:size=${outputWidth}x${outputHeight}:duration=${duration}[bg]`
      );
      
      let baseStream = '[bg]';
      const visibleLayers = cropData.filter(layer => layer && layer.crop && !layer.hidden);
      
      // Sort layers by z-index to ensure correct stacking order (bottom to top)
      // Note: In the crop page, layer #1 is back (lowest), highest number is front (highest)
      // So we sort in REVERSE order: higher zIndex values should be processed LAST (on top)
      visibleLayers.sort((a, b) => {
        const aZ = (a.zIndex !== undefined) ? a.zIndex : 0;
        const bZ = (b.zIndex !== undefined) ? b.zIndex : 0;
        return bZ - aZ; // REVERSED: higher zIndex goes later in processing (on top)
      });
      
      // Debug logging
      console.log('🎬 Export clip with effects:', {
        hasActiveCrops,
        cropLayersCount: cropData.length,
        visibleLayersCount: visibleLayers.length,
        originalLayerOrder: cropData.map((layer, i) => ({ 
          originalIndex: i, 
          zIndex: layer.zIndex, 
          hidden: layer.hidden 
        })),
        sortedLayerOrder: visibleLayers.map((layer, i) => ({ 
          sortedIndex: i, 
          zIndex: layer.zIndex,
          originalIndex: cropData.indexOf(layer)
        })),
        outputDimensions: `${outputWidth}x${outputHeight}`,
        captionText: captionData.text || 'none'
      });

      // Process each crop layer and composite them
      visibleLayers.forEach((layer, index) => {
        const { x, y, width, height } = layer.crop;
        const { scale = 1, rotate = 0, x: offsetX = 0, y: offsetY = 0 } = layer.transform || {};
        
        console.log(`🧩 Processing layer ${index}:`, { zIndex: layer.zIndex || 0, rotate, scale, crop: { x, y, width, height } });
        
        // For each layer, start from the original video input
        let layerStream = '[0:v]';
        
        // Crop this specific region from the original video
        filterComplex.push(`${layerStream}crop=${width}:${height}:${x}:${y}[crop${index}]`);
        layerStream = `[crop${index}]`;
        
        // Apply scale if needed
        if (scale !== 1) {
          const newWidth = Math.round(width * scale);
          const newHeight = Math.round(height * scale);
          filterComplex.push(`${layerStream}scale=${newWidth}:${newHeight}[scaled${index}]`);
          layerStream = `[scaled${index}]`;
        }
        
        // Apply rotation if needed - transparent background approach
        if (rotate !== 0) {
          // Handle common 90-degree rotations with transpose (perfect)
          if (Math.abs(rotate % 90) < 0.1) {
            const normalizedRotate = ((rotate % 360) + 360) % 360;
            if (normalizedRotate === 90) {
              filterComplex.push(`${layerStream}transpose=1[rotated${index}]`);
            } else if (normalizedRotate === 180) {
              filterComplex.push(`${layerStream}transpose=1,transpose=1[rotated${index}]`);
            } else if (normalizedRotate === 270) {
              filterComplex.push(`${layerStream}transpose=2[rotated${index}]`);
            } else {
              // 0 degrees, no rotation needed
              filterComplex.push(`${layerStream}null[rotated${index}]`);
            }
          } else {
            // For arbitrary angles, auto-size output to fit rotated content
            const rotationRadians = rotate * Math.PI / 180;
            filterComplex.push(`${layerStream}rotate=${rotationRadians}:fillcolor=none:ow=rotw(${rotationRadians}):oh=roth(${rotationRadians})[rotated${index}]`);
          }
          layerStream = `[rotated${index}]`;
        }
        
        // Composite this layer onto the background/previous layers
        // Position based on transform offset + centering
        const overlayX = `(W-w)/2+${offsetX}`;
        const overlayY = `(H-h)/2+${offsetY}`;
        
        filterComplex.push(
          `${baseStream}${layerStream}overlay=${overlayX}:${overlayY}[comp${index}]`
        );
        baseStream = `[comp${index}]`;
      });
      
      currentStream = baseStream;
    } else if (!hasActiveCrops && outputWidth !== videoResolution.width) {
      // No crops but need to resize - use simple scale
      filterComplex.push(`${currentStream}scale=${outputWidth}:${outputHeight}[resized]`);
      currentStream = '[resized]';
    }

    // Support multiple caption layers (captionData.layers or array or single)
    let captionLayers = [];
    if (Array.isArray(captionData)) {
      captionLayers = captionData;
    } else if (Array.isArray(captionData.layers)) {
      captionLayers = captionData.layers;
    } else if (captionData.text) {
      captionLayers = [captionData];
    }
    captionLayers.forEach((caption, captionIdx) => {
      if (!caption.text || !caption.text.trim()) return;
      console.log(`🎬 Backend received caption layer ${captionIdx}:`, JSON.stringify(caption, null, 2));
      const fontSize = caption.fontSize || 24;
      const fontFamily = caption.fontFamily || 'Arial';
      const customFontName = caption.customFontName;
      const customFontPath = caption.customFontPath;
      const fontColor = caption.fontColor || caption.color || '#ffffff';
      // Alignment detection
      let textAlign = 'left';
      if (caption.textAlign) textAlign = caption.textAlign;
      else if (caption.alignment) textAlign = caption.alignment;
      else if (caption.align) textAlign = caption.align;
      else if (caption.style && caption.style.textAlign) textAlign = caption.style.textAlign;
      else if (caption.style && caption.style.alignment) textAlign = caption.style.alignment;
      const text = caption.text.replace(/'/g, "\\'");
      // Font size calculation
      let scaledFontSize = fontSize;
      if (caption.box) {
        const boxWidthScaled = caption.box.width;
        const boxHeightScaled = caption.box.height;
        const maxFontSize = 100;
        const minFontSize = 4;
        scaledFontSize = maxFontSize;
        let fitsInBox = false;
        while (scaledFontSize >= minFontSize && !fitsInBox) {
          let avgCharWidth;
          if (fontFamily.toLowerCase().includes('impact')) avgCharWidth = scaledFontSize * 0.42;
          else if (fontFamily.toLowerCase().includes('arial')) avgCharWidth = scaledFontSize * 0.48;
          else avgCharWidth = scaledFontSize * 0.45;
          const effectiveWidth = boxWidthScaled - 4;
          const maxCharsPerLine = Math.floor(effectiveWidth / avgCharWidth);
          const estimatedLines = Math.ceil(text.length / maxCharsPerLine);
          const estimatedHeight = estimatedLines * scaledFontSize * 1.2;
          if (estimatedHeight <= boxHeightScaled - 4) fitsInBox = true;
          else scaledFontSize -= 1;
        }
      }
      let fontParam = '';
      if (fontFamily === 'custom' || customFontPath || customFontName) {
        if (customFontPath) {
          const normalizedPath = customFontPath.replace(/\\/g, '/');
          if (fs.existsSync(customFontPath)) fontParam = `fontfile='${normalizedPath}':`;
          else if (customFontName) fontParam = `font='${customFontName}':`;
          else fontParam = `font='Arial':`;
        } else if (customFontName) {
          let actualFontName = customFontName;
          if (customFontName.startsWith('Custom_')) actualFontName = customFontName.replace('Custom_', '');
          fontParam = `font='${actualFontName}':`;
        } else fontParam = `font='Arial':`;
      } else {
        const systemFont = fontFamily.replace(/\s+/g, '');
        fontParam = `font='${systemFont}':`;
      }
      const ffmpegColor = fontColor.replace('#', '');
      let textX = '(w-text_w)/2';
      let textY = 'h-th-30';
      if (caption.box) {
        const boxXScaled = caption.box.x;
        const boxYScaled = caption.box.y;
        const boxWidthScaled = caption.box.width;
        const boxHeightScaled = caption.box.height;
        if (textAlign === 'left') textX = Math.round(boxXScaled + 5);
        else if (textAlign === 'right') textX = `${Math.round(boxXScaled + boxWidthScaled - 5)}-text_w`;
        else textX = `${Math.round(boxXScaled + boxWidthScaled / 2)}-(text_w/2)`;
        const lineHeight = scaledFontSize * 1.2;
        const totalTextHeight = lineHeight;
        const verticalOffset = (boxHeightScaled - totalTextHeight) / 2 + 2;
        textY = Math.round(boxYScaled + verticalOffset);
      } else {
        if (textAlign === 'left') textX = '30';
        else if (textAlign === 'right') textX = 'w-text_w-30';
      }
      // Text wrapping
      const wrapText = (text, maxWidth, fontSize) => {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        let avgCharWidth;
        if (fontFamily.toLowerCase().includes('impact')) avgCharWidth = fontSize * 0.42;
        else if (fontFamily.toLowerCase().includes('arial')) avgCharWidth = fontSize * 0.48;
        else avgCharWidth = fontSize * 0.45;
        const effectiveMaxWidth = maxWidth - 4;
        for (const word of words) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const estimatedWidth = testLine.length * avgCharWidth;
          if (estimatedWidth <= effectiveMaxWidth || !currentLine) currentLine = testLine;
          else {
            if (currentLine) lines.push(currentLine.trim());
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine.trim());
        return lines;
      };
      let lines = text.split('\n');
      if (caption.box) {
        const boxWidthScaled = caption.box.width;
        const wrappedLines = [];
        lines.forEach(line => {
          const wrapped = wrapText(line, boxWidthScaled - 4, scaledFontSize);
          wrappedLines.push(...wrapped);
        });
        lines = wrappedLines;
        const lineHeight = scaledFontSize * 1.2;
        const totalTextHeight = lines.length * lineHeight;
        const boxHeightScaled = caption.box.height;
        if (totalTextHeight > boxHeightScaled - 4) {
          const maxLinesForBox = Math.floor((boxHeightScaled - 4) / (scaledFontSize * 1.2));
          if (maxLinesForBox > 0 && lines.length > maxLinesForBox) {
            scaledFontSize = Math.max(8, Math.floor((boxHeightScaled - 4) / (lines.length * 1.2)));
          }
        }
      }
      if (lines.length === 1) {
        filterComplex.push(
          `${currentStream}drawtext=text='${lines[0]}':fontcolor=${ffmpegColor}:fontsize=${scaledFontSize}:${fontParam}x=${textX}:y=${textY}[captioned${captionIdx}]`
        );
        currentStream = `[captioned${captionIdx}]`;
      } else {
        const lineHeight = Math.round(scaledFontSize * 1.2);
        const totalHeight = lines.length * lineHeight;
        let boxYScaled, boxHeightScaled;
        if (caption.box) {
          boxYScaled = caption.box.y;
          boxHeightScaled = caption.box.height;
        } else {
          boxYScaled = 0;
          boxHeightScaled = outputHeight;
        }
        const verticalOffset = (boxHeightScaled - totalHeight) / 2 + 2;
        const startY = Math.round(boxYScaled + verticalOffset);
        lines.forEach((line, index) => {
          const escapedLine = line.replace(/'/g, "\\'");
          const y = startY + (index * lineHeight);
          const outputLabel = index === lines.length - 1 ? `captioned${captionIdx}` : `caption${captionIdx}_line${index}`;
          filterComplex.push(
            `${currentStream}drawtext=text='${escapedLine}':fontcolor=${ffmpegColor}:fontsize=${scaledFontSize}:${fontParam}x=${textX}:y=${y}[${outputLabel}]`
          );
          currentStream = `[${outputLabel}]`;
        });
      }
    });

    // Apply filters and output settings
    if (filterComplex.length > 0) {
      // Use complex filter - output dimensions are handled in the filter chain
      // When using complex filters, we need to explicitly map both video and audio streams
      console.log('🎵 Using complex filter with explicit stream mapping');
      console.log('🎬 Filter complex chain:', filterComplex);
      command = command
        .complexFilter(filterComplex)
        .outputOptions([
          '-map', `[${currentStream.slice(1, -1)}]`,  // Map the video output from complex filter
          '-map', '0:a'                               // Map the original audio stream
        ])
        .videoCodec('libx264')
        .audioCodec('aac');
    } else {
      // No complex filters needed - use simple resize if dimensions changed
      console.log('🎵 Using simple video processing with audio');
      if (outputWidth !== videoResolution.width || outputHeight !== videoResolution.height) {
        command = command
          .videoCodec('libx264')
          .audioCodec('aac')
          .size(`${outputWidth}x${outputHeight}`);
      } else {
        command = command
          .videoCodec('libx264')
          .audioCodec('aac');
      }
    }

    command
      .outputOptions('-preset', 'ultrafast')
      .output(outPath)
      .on('start', (commandLine) => {
        console.log('🚀 FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          console.log('⏳ Processing: ' + Math.round(progress.percent) + '% done');
        }
      })
      .on('end', () => {
        console.log('✅ Export completed successfully');
        resolve(outPath);
      })
      .on('error', (err, stdout, stderr) => {
        console.error('❌ Export error:', err.message);
        if (stdout) console.error('📺 FFmpeg stdout:', stdout);
        if (stderr) console.error('📺 FFmpeg stderr:', stderr);
        reject(err);
      })
      .run();
  });
}

async function exportClips(buffer, fileName, clips) {
  const outputDir = app.getPath('temp');
  const inputPath = writeBufferToFile(buffer, fileName, outputDir);

  const clipPaths = [];

  for (let i = 0; i < clips.length; i++) {
    const { adjustedStart, adjustedEnd } = clips[i];
    const duration = Math.max(0, adjustedEnd - adjustedStart);
    const outPath = path.join(outputDir, `clip-${i}.mp4`);
    await cutClip(inputPath, adjustedStart, duration, outPath);
    clipPaths.push(outPath);
  }

  return { inputPath, clipPaths };
}

async function exportClipsWithEffects(buffer, fileName, clips, videoResolution, outputResolution) {
  const outputDir = app.getPath('temp');
  const inputPath = writeBufferToFile(buffer, fileName, outputDir);

  const clipPaths = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const outPath = path.join(outputDir, `clip-effects-${i}.mp4`);
    await cutClipWithEffects(inputPath, clip, outPath, videoResolution, outputResolution);
    clipPaths.push(outPath);
  }

  return { inputPath, clipPaths };
}

module.exports = { exportClips, exportClipsWithEffects, concatClips };
