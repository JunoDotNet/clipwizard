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

module.exports = { exportClips, concatClips };
