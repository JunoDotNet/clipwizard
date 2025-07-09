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
      
      // Debug logging
      console.log('🎬 Export clip with effects:', {
        hasActiveCrops,
        cropLayersCount: cropData.length,
        visibleLayers: cropData.filter(layer => layer && layer.crop && !layer.hidden).length,
        outputDimensions: `${outputWidth}x${outputHeight}`,
        captionText: captionData.text || 'none'
      });

      // Process each crop layer and composite them
      visibleLayers.forEach((layer, index) => {
        const { x, y, width, height } = layer.crop;
        const { scale = 1, rotate = 0, x: offsetX = 0, y: offsetY = 0 } = layer.transform || {};
        
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
        
        // Apply rotation if needed
        if (rotate !== 0) {
          filterComplex.push(`${layerStream}rotate=${rotate * Math.PI / 180}[rotated${index}]`);
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
      const fontSize = captionData.fontSize || 24;
      const text = captionData.text.replace(/'/g, "\\'"); // Escape single quotes
      
      // Scale font size for vertical video
      const scaledFontSize = hasActiveCrops ? Math.round(fontSize * 1.5) : fontSize;
      
      // Add text overlay
      filterComplex.push(
        `${currentStream}drawtext=text='${text}':fontcolor=white:fontsize=${scaledFontSize}:x=(w-text_w)/2:y=h-th-30:box=1:boxcolor=black@0.5[captioned]`
      );
      currentStream = '[captioned]';
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
