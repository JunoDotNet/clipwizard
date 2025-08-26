// src/main/exportClips.js
const path = require('path');
const fs = require('fs');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffprobeStatic = require('ffprobe-static');

// Ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Create unique temp dir
function tmpDir() {
  const dir = path.join(os.tmpdir(), 'clipwizard', Date.now().toString());
  ensureDir(dir);
  return dir;
}

// Get natural video resolution
function getVideoResolution(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      const stream = metadata.streams.find(s => s.width && s.height);
      if (stream) {
        resolve({ width: stream.width, height: stream.height });
      } else {
        reject(new Error('No video stream found'));
      }
    });
  });
}

// Core crop+caption logic (adapted from old working version)
function cutClipWithEffects(inputPath, clip, outPath, videoResolution, outputResolution) {
  return new Promise((resolve, reject) => {
    const { adjustedStart, adjustedEnd, cropData = [], captionData = {} } = clip;
    const duration = Math.max(0, adjustedEnd - adjustedStart);

    let command = ffmpeg(inputPath)
      .seekInput(adjustedStart)
      .duration(duration);

    const outputWidth = outputResolution.width;
    const outputHeight = outputResolution.height;
    const hasActiveCrops = cropData.length > 0;

    let filterComplex = [];
    let currentStream = '[0:v]';

    // Handle crop layers
    if (hasActiveCrops) {
      filterComplex.push(`color=black:size=${outputWidth}x${outputHeight}:duration=${duration}[bg]`);
      let baseStream = '[bg]';
      const visibleLayers = cropData.filter(layer => layer && layer.crop && !layer.hidden);

      visibleLayers.forEach((layer, index) => {
        const { x, y, width, height } = layer.crop;
        const { scale = 1, rotate = 0, x: offsetX = 0, y: offsetY = 0 } = layer.transform || {};

        let layerStream = '[0:v]';
        filterComplex.push(`${layerStream}crop=${width}:${height}:${x}:${y}[crop${index}]`);
        layerStream = `[crop${index}]`;

        if (scale !== 1) {
          const newWidth = Math.round(width * scale);
          const newHeight = Math.round(height * scale);
          filterComplex.push(`${layerStream}scale=${newWidth}:${newHeight}[scaled${index}]`);
          layerStream = `[scaled${index}]`;
        }

        if (rotate !== 0) {
          const rotationRadians = rotate * Math.PI / 180;
          filterComplex.push(`${layerStream}rotate=${rotationRadians}:fillcolor=none[rotated${index}]`);
          layerStream = `[rotated${index}]`;
        }

        const overlayX = `(W-w)/2+${offsetX}`;
        const overlayY = `(H-h)/2+${offsetY}`;
        filterComplex.push(`${baseStream}${layerStream}overlay=${overlayX}:${overlayY}[comp${index}]`);
        baseStream = `[comp${index}]`;
      });

      currentStream = baseStream;
    } else if (!hasActiveCrops && outputWidth !== videoResolution.width) {
      filterComplex.push(`${currentStream}scale=${outputWidth}:${outputHeight}[resized]`);
      currentStream = '[resized]';
    }

    // Track if any caption was actually rendered
    let captionRendered = false;
    if (Array.isArray(captionData.layers) && captionData.layers.length > 0) {
      captionData.layers.forEach((layer, idx) => {
        if (!layer.text || !layer.text.trim()) return;

        let fontSize = layer.fontSize || 24;
        const fontFamily = layer.fontFamily || 'Arial';
        const fontColor = (layer.fontColor || layer.color || '#ffffff').replace('#', '');
        const textAlign = layer.textAlign || 'left';

        if (layer.box) {
          const boxX = Math.round(layer.box.x);
          const boxY = Math.round(layer.box.y);
          const boxW = Math.round(layer.box.width);
          const boxH = Math.round(layer.box.height);

          const lineHeightMult = 1.2;

          // Word wrap based on box width
          const wrapText = (text, maxWidthPx, fontSize) => {
            // Trim the text to remove leading/trailing spaces
            const trimmedText = text.trim();
            const words = trimmedText.split(/\s+/).filter(word => word.length > 0); // Remove empty strings
            const lines = [];
            let currentLine = '';
            const avgCharWidth = fontSize * 0.5; // tweak if needed
            const maxChars = Math.floor(maxWidthPx / avgCharWidth);

            words.forEach(word => {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              if (testLine.length <= maxChars) {
                currentLine = testLine;
              } else {
                if (currentLine) lines.push(currentLine);
                currentLine = word;
              }
            });
            if (currentLine) lines.push(currentLine);
            return lines;
          };

          let lines = wrapText(layer.text, boxW - 10, fontSize);
          let totalHeight = lines.length * fontSize * lineHeightMult;

          // Auto-size font to fit box (similar to preview logic)
          // Shrink font iteratively until text fits both width and height constraints
          while ((totalHeight > boxH - 4 || lines.some(line => line.length * fontSize * 0.5 > boxW - 10)) && fontSize > 8) {
            fontSize -= 1;
            lines = wrapText(layer.text, boxW - 10, fontSize);
            totalHeight = lines.length * fontSize * lineHeightMult;
          }

          // Horizontal alignment
          let textX;
          if (textAlign === 'left') textX = `${boxX + 5}`;
          else if (textAlign === 'right') textX = `${boxX + boxW - 5}-text_w`;
          else textX = `${boxX + boxW / 2}-(text_w/2)`;

          // Vertical centering
          const verticalOffset = (boxH - totalHeight) / 2;
          const baseY = `${boxY + verticalOffset}`;

          // Render each line
          lines.forEach((line, lineIdx) => {
            const outputLabel = `caption_${idx}_${lineIdx}`;
            const yPos = `${baseY}+${lineIdx * fontSize * lineHeightMult}`;
            filterComplex.push(
              `${currentStream}drawtext=text='${escapeForFfmpeg(line)}':fontcolor=${fontColor}:fontsize=${fontSize}:font='${fontFamily}':x=${textX}:y=${yPos}[${outputLabel}]`
            );
            currentStream = `[${outputLabel}]`;
            captionRendered = true;
          });
        }
      });
    }
    // Always use the last label as the output for mapping
    let outputLabelForMap = currentStream;

    if (filterComplex.length > 0) {
      command = command
        .complexFilter(filterComplex)
        .outputOptions(['-map', outputLabelForMap, '-map', '0:a'])
        .videoCodec('libx264')
        .audioCodec('aac');
    } else {
      command = command.videoCodec('libx264').audioCodec('aac');
    }

    command
      .outputOptions('-preset', 'ultrafast')
      .save(outPath)
      .on('start', (cmdLine) => {
        console.log('[ffmpeg] Command:', cmdLine);
      })
      .on('stderr', (stderrLine) => {
        // Log each line of ffmpeg stderr output
        console.log('[ffmpeg] stderr:', stderrLine);
      })
      .on('end', () => resolve(outPath))
      .on('error', (err, stdout, stderr) => {
        console.error('[ffmpeg] Error:', err);
        if (stdout) console.error('[ffmpeg] stdout:', stdout);
        if (stderr) console.error('[ffmpeg] stderr:', stderr);
        reject(err);
      });
  });
}

// Main export function
async function exportClipsUnified(inputPath, inputName, clips, outputResolution) {
  const dir = tmpDir();
  const clipPaths = [];

  const videoResolution = await getVideoResolution(inputPath);

  for (let i = 0; i < clips.length; i++) {
    const c = clips[i];
    const outPath = path.join(dir, `part_${i.toString().padStart(3, '0')}.mp4`);
    await cutClipWithEffects(inputPath, c, outPath, videoResolution, outputResolution);
    clipPaths.push(outPath);
  }

  return { clipPaths, tempDir: dir };
}

function escapeForFfmpeg(text) {
  if (!text) return '';
  return text
    .replace(/'/g, '\u2019') // replace ASCII single quote with Unicode right single quote
    .replace(/\\/g, '\\') // escape backslashes first
    .replace(/:/g, '\:') // escape colons
    .replace(/,/g, '\,') // escape commas
    .replace(/=/g, '\='); // escape equals (can break drawtext)
}

// Concat helper
function concatClips(clipPaths, outPath) {
  return new Promise((resolve, reject) => {
    const listPath = outPath + '.txt';
    fs.writeFileSync(listPath, clipPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n'));
    ffmpeg()
      .input(listPath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])
      .on('end', () => {
        try { fs.unlinkSync(listPath); } catch {}
        resolve(outPath);
      })
      .on('error', reject)
      .save(outPath);
  });
}

module.exports = {
  exportClipsUnified,
  concatClips,
};
