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

function cutClipWithEffects(inputPath, clip, outPath, videoResolution) {
  return new Promise((resolve, reject) => {
    const { adjustedStart, adjustedEnd, cropData = [], captionData = {} } = clip;
    const duration = Math.max(0, adjustedEnd - adjustedStart);
    
    let command = ffmpeg(inputPath)
      .setStartTime(adjustedStart)
      .setDuration(duration);

    // Determine if we're creating vertical video (crops present = vertical output)
    const hasActiveCrops = cropData.length > 0;
    let outputWidth, outputHeight;
    
    if (hasActiveCrops) {
      // Vertical video output (swap dimensions)
      outputWidth = videoResolution.height;
      outputHeight = videoResolution.width;
    } else {
      // Original aspect ratio
      outputWidth = videoResolution.width;
      outputHeight = videoResolution.height;
    }

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

    // Apply caption overlay if present
    if (captionData.text && captionData.text.trim()) {
      console.log('🎬 Backend received caption data:', JSON.stringify(captionData, null, 2));
      
      const fontSize = captionData.fontSize || 24;
      const fontFamily = captionData.fontFamily || 'Arial';
      const customFontName = captionData.customFontName;
      const customFontPath = captionData.customFontPath;
      const fontColor = captionData.fontColor || captionData.color || '#ffffff';
      
      // Check multiple possible property names for text alignment (more comprehensive)
      let textAlign = 'left'; // default - match UI default
      if (captionData.textAlign) {
        textAlign = captionData.textAlign;
      } else if (captionData.alignment) {
        textAlign = captionData.alignment;
      } else if (captionData.align) {
        textAlign = captionData.align;
      } else if (captionData.style && captionData.style.textAlign) {
        textAlign = captionData.style.textAlign;
      } else if (captionData.style && captionData.style.alignment) {
        textAlign = captionData.style.alignment;
      }
      
      console.log('🎯 Text alignment detection:', {
        captionDataKeys: Object.keys(captionData),
        captionDataTextAlign: captionData.textAlign,
        captionDataAlignment: captionData.alignment,
        captionDataAlign: captionData.align,
        captionDataStyle: captionData.style,
        rawCaptionDataForAlignment: JSON.stringify({
          textAlign: captionData.textAlign,
          alignment: captionData.alignment,
          align: captionData.align
        }),
        finalTextAlign: textAlign,
        expectedAlignment: 'User claims this should be LEFT, but we detected CENTER'
      });
      
      const text = captionData.text.replace(/'/g, "\\'"); // Escape single quotes
      
      // Calculate better font size based on bounding box dimensions (match UI auto-sizing exactly)
      let scaledFontSize = fontSize;
      if (captionData.box) {
        // Scale bounding box to output video dimensions
        const boxWidthScaled = (captionData.box.width / videoResolution.height) * outputWidth;
        const boxHeightScaled = (captionData.box.height / videoResolution.width) * outputHeight;
        
        // Match UI's drawWrappedText logic: start with maxFontSize and shrink to fit
        const maxFontSize = 100; // Same as UI default
        const minFontSize = 4;   // Same as UI default
        const padding = 6;       // Same as UI default
        
        // Start with max size and shrink until it fits (like UI does)
        scaledFontSize = maxFontSize;
        
        // Simulate text wrapping to check if it fits
        let fitsInBox = false;
        while (scaledFontSize >= minFontSize && !fitsInBox) {
          // Estimate wrapped lines with balanced character width to stay within bounds
          let avgCharWidth;
          if (fontFamily.toLowerCase().includes('impact')) {
            avgCharWidth = scaledFontSize * 0.42; // Balanced for Impact
          } else if (fontFamily.toLowerCase().includes('arial')) {
            avgCharWidth = scaledFontSize * 0.48; // Balanced for Arial
          } else {
            avgCharWidth = scaledFontSize * 0.45; // Balanced general default
          }
          
          const effectiveWidth = boxWidthScaled - 4; // Small padding to stay within bounds
          const maxCharsPerLine = Math.floor(effectiveWidth / avgCharWidth);
          const estimatedLines = Math.ceil(text.length / maxCharsPerLine);
          const estimatedHeight = estimatedLines * scaledFontSize * 1.2;
          
          if (estimatedHeight <= boxHeightScaled - 4) { // Match padding
            fitsInBox = true;
          } else {
            scaledFontSize -= 1;
          }
        }
        
        console.log('📏 Font size calculation (UI-matched):', {
          originalBox: captionData.box,
          boxWidthScaled,
          boxHeightScaled,
          textLength: text.length,
          finalFontSize: scaledFontSize,
          maxFontSize,
          minFontSize
        });
      }
      
      let fontParam = '';
      if (fontFamily === 'custom') {
        if (customFontPath) {
          // Use custom font file path
          fontParam = `fontfile='${customFontPath.replace(/\\/g, '/')}':`;
        } else if (customFontName) {
          // Use custom font name
          fontParam = `font='${customFontName}':`;
        } else {
          // Fallback to Arial
          fontParam = `font='Arial':`;
        }
      } else {
        // Use system font
        const systemFont = fontFamily.replace(/\s+/g, '');
        fontParam = `font='${systemFont}':`;
      }
      
      // Convert hex color to ffmpeg format (remove #)
      const ffmpegColor = fontColor.replace('#', '');
      
      // Calculate text position based on bounding box (not bottom of video)
      let textX = '(w-text_w)/2'; // center (default)
      let textY = 'h-th-30'; // fallback to bottom if no box position
      
      if (captionData.box) {
        // Scale bounding box position to output video dimensions
        const boxXScaled = (captionData.box.x / videoResolution.height) * outputWidth;
        const boxYScaled = (captionData.box.y / videoResolution.width) * outputHeight;
        const boxWidthScaled = (captionData.box.width / videoResolution.height) * outputWidth;
        const boxHeightScaled = (captionData.box.height / videoResolution.width) * outputHeight;
        
        // Position text within the scaled bounding box - respect user's alignment choice
        if (textAlign === 'left') {
          textX = Math.round(boxXScaled + 5); // Small left padding to stay within bounds
        } else if (textAlign === 'right') {
          textX = `${Math.round(boxXScaled + boxWidthScaled - 5)}-text_w`; // Small right padding
        } else { // center
          textX = `${Math.round(boxXScaled + boxWidthScaled / 2)}-(text_w/2)`; // center each line individually
        }
        
        // Position vertically - match UI's drawWrappedText exactly
        // For single line, calculate offset like UI does: (height - totalHeight) / 2 + padding
        const lineHeight = scaledFontSize * 1.2;
        const totalTextHeight = lineHeight; // Single line
        const verticalOffset = (boxHeightScaled - totalTextHeight) / 2 + 2; // Small 2px padding
        textY = Math.round(boxYScaled + verticalOffset);
        
        console.log('📍 Text positioning (UI-matched):', {
          originalBox: captionData.box,
          scaledBox: { x: boxXScaled, y: boxYScaled, width: boxWidthScaled, height: boxHeightScaled },
          textMetrics: { lineHeight, totalTextHeight: lineHeight, verticalOffset },
          finalPosition: { x: textX, y: textY },
          textAlign: textAlign,
          uiCalculation: `(${boxHeightScaled} - ${lineHeight}) / 2 + 6 = ${verticalOffset}`
        });
      } else {
        // Fallback positioning without bounding box
        if (textAlign === 'left') {
          textX = '30'; // left with padding
        } else if (textAlign === 'right') {
          textX = 'w-text_w-30'; // right with padding
        }
      }
      
      // Helper function to estimate text wrapping (balanced to stay within bounding box)
      const wrapText = (text, maxWidth, fontSize) => {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        // Balanced character width estimation - generous but not too much
        let avgCharWidth;
        if (fontFamily.toLowerCase().includes('impact')) {
          avgCharWidth = fontSize * 0.42; // Balanced for Impact
        } else if (fontFamily.toLowerCase().includes('arial')) {
          avgCharWidth = fontSize * 0.48; // Balanced for Arial
        } else {
          avgCharWidth = fontSize * 0.45; // Balanced general default
        }
        
        // Use most of the width but leave small margin to stay within bounds
        const effectiveMaxWidth = maxWidth - 4; // Small 4px padding to stay within bounds
        
        for (const word of words) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          // Use actual character count estimation rather than just length
          const estimatedWidth = testLine.length * avgCharWidth;
          
          if (estimatedWidth <= effectiveMaxWidth || !currentLine) {
            currentLine = testLine;
          } else {
            if (currentLine) lines.push(currentLine.trim());
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine.trim());
        
        return lines;
      };
      
      // Handle multi-line text with proper wrapping
      let lines = text.split('\n'); // Start with explicit line breaks
      
      // If we have a bounding box, wrap long lines to fit
      if (captionData.box) {
        const boxWidthScaled = (captionData.box.width / videoResolution.height) * outputWidth;
        const wrappedLines = [];
        
        lines.forEach(line => {
          const wrapped = wrapText(line, boxWidthScaled - 4, scaledFontSize); // Small 4px padding to stay within bounds
          wrappedLines.push(...wrapped);
        });
        
        lines = wrappedLines;
        
        console.log('📝 Text wrapping:', {
          originalText: text,
          boxWidth: boxWidthScaled,
          fontSize: scaledFontSize,
          wrappedLines: lines
        });
        
        // Auto-adjust font size if wrapped text is too tall for bounding box
        const lineHeight = scaledFontSize * 1.2;
        const totalTextHeight = lines.length * lineHeight;
        const boxHeightScaled = (captionData.box.height / videoResolution.width) * outputHeight;
        
        if (totalTextHeight > boxHeightScaled - 4) { // Small 4px padding to stay within bounds
          // Reduce font size to fit
          const maxLinesForBox = Math.floor((boxHeightScaled - 4) / (scaledFontSize * 1.2));
          if (maxLinesForBox > 0 && lines.length > maxLinesForBox) {
            // Recalculate with smaller font
            scaledFontSize = Math.max(8, Math.floor((boxHeightScaled - 4) / (lines.length * 1.2)));
            
            console.log('📏 Font size adjusted for text height:', {
              originalFontSize: fontSize,
              textHeight: totalTextHeight,
              boxHeight: boxHeightScaled,
              adjustedFontSize: scaledFontSize
            });
          }
        }
      }
      if (lines.length === 1) {
        // Single line - remove stroke to match UI
        filterComplex.push(
          `${currentStream}drawtext=text='${lines[0]}':fontcolor=${ffmpegColor}:fontsize=${scaledFontSize}:${fontParam}x=${textX}:y=${textY}[captioned]`
        );
        currentStream = '[captioned]';
      } else {
        // Multi-line - create overlay for each line without stroke
        const lineHeight = Math.round(scaledFontSize * 1.2);
        const totalHeight = lines.length * lineHeight;
        
        // Match UI's positioning exactly: (height - totalHeight) / 2 + padding
        // Get box dimensions (they should already be calculated above if we have a box)
        let boxYScaled, boxHeightScaled;
        if (captionData.box) {
          boxYScaled = (captionData.box.y / videoResolution.width) * outputHeight;
          boxHeightScaled = (captionData.box.height / videoResolution.width) * outputHeight;
        } else {
          // Fallback values if no box
          boxYScaled = 0;
          boxHeightScaled = outputHeight;
        }
        
        const verticalOffset = (boxHeightScaled - totalHeight) / 2 + 2; // Small 2px padding
        const startY = Math.round(boxYScaled + verticalOffset);
        
        console.log('📍 Multi-line positioning (UI-matched):', {
          lines: lines.length,
          lineHeight,
          totalHeight,
          boxHeight: boxHeightScaled,
          verticalOffset,
          startY,
          uiCalculation: `(${boxHeightScaled} - ${totalHeight}) / 2 + 6 = ${verticalOffset}`
        });
        
        lines.forEach((line, index) => {
          const escapedLine = line.replace(/'/g, "\\'"); // Escape single quotes for each line
          const y = startY + (index * lineHeight);
          const outputLabel = index === lines.length - 1 ? 'captioned' : `line${index}`;
          
          filterComplex.push(
            `${currentStream}drawtext=text='${escapedLine}':fontcolor=${ffmpegColor}:fontsize=${scaledFontSize}:${fontParam}x=${textX}:y=${y}[${outputLabel}]`
          );
          currentStream = `[${outputLabel}]`;
        });
      }
    }

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

async function exportClipsWithEffects(buffer, fileName, clips, videoResolution) {
  const outputDir = app.getPath('temp');
  const inputPath = writeBufferToFile(buffer, fileName, outputDir);

  const clipPaths = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const outPath = path.join(outputDir, `clip-effects-${i}.mp4`);
    await cutClipWithEffects(inputPath, clip, outPath, videoResolution);
    clipPaths.push(outPath);
  }

  return { inputPath, clipPaths };
}

module.exports = { exportClips, exportClipsWithEffects, concatClips };
