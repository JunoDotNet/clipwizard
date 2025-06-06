// src/main/extractAudioWav.js
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');

// ✅ Dynamically set ffmpeg path for both dev and production
const basePath = app.isPackaged
  ? path.join(process.resourcesPath, 'whisper') // packaged
  : path.join(app.getAppPath(), 'src', 'whisper'); // ✅ dev (correct subfolder)

const ffmpegPath = path.join(basePath, 'ffmpeg.exe');
console.log('🔍 ffmpegPath resolved to:', ffmpegPath);
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Extracts audio from a video or audio file buffer and returns a path to the .wav file.
 * @param {Buffer} buffer - File buffer (MP4, MOV, MKV, MP3, etc.).
 * @param {string} originalFileName - Original file name for extension.
 * @param {string} outputDir - Directory to save output.
 * @returns {Promise<string>} - Resolved path to the .wav output.
 */
function extractAudioWav(buffer, originalFileName, outputDir) {
  return new Promise((resolve, reject) => {
    const inputExt = path.extname(originalFileName);
    const inputFile = path.join(outputDir, `input-${uuidv4()}${inputExt}`);
    const outputFile = inputFile.replace(inputExt, '.wav');

    try {
      fs.writeFileSync(inputFile, buffer);
    } catch (err) {
      return reject(new Error(`❌ Failed to save temp input file: ${err.message}`));
    }

    ffmpeg(inputFile)
      .noVideo()
      .audioCodec('pcm_s16le')
      .format('wav')
      .on('end', () => resolve(outputFile))
      .on('error', (err) => {
        console.error('❌ ffmpeg error:', err);
        reject(err);
      })
      .save(outputFile);
  });
}

module.exports = { extractAudioWav };
