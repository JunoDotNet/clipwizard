const { app, BrowserWindow, session, ipcMain } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const ffprobeStatic = require('ffprobe-static');
const ffprobeRuntimePath = path.join(app.getAppPath(), 'whisper', 'ffprobe.exe');
console.log('🧠 ffprobe path set to:', ffprobeRuntimePath);
ffmpeg.setFfprobePath(ffprobeRuntimePath);

console.log('🧠 ffprobeStatic.path:', ffprobeStatic.path); 
console.log('ffprobe-static module:', ffprobeStatic);
console.log('🚀 Loaded MAIN process from', __filename);


const ffmpegPath = path.join(app.getAppPath(), 'src', 'whisper', 'ffmpeg.exe');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobeStatic.path);

const { extractAudioWav } = require('./main/extractAudioWav');
const { dialog } = require('electron');
const { exportClips, exportClipsWithEffects, concatClips } = require('./main/exportClips');


// ✅ Define isDev before using it
const isDev = !app.isPackaged;

if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();
};


  ipcMain.handle('get-wav-buffer', async (event, wavPath) => {
    return fs.readFileSync(wavPath);
  });


app.whenReady().then(() => {
  // ✅ Set up CSP headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data:; media-src 'self' blob:",
        ],
      },
    });
  });

  ipcMain.handle('transcribe-buffer', async (event, buffer, fileName, model = 'ggml-base.en.bin') => {
    const ext = path.extname(fileName).toLowerCase();
    const baseName = `input-${uuidv4()}`;
    const outputDir = app.getPath('userData');
    const wavPath = path.join(outputDir, `${baseName}.wav`);
    const outputJsonPath = path.join(outputDir, `${baseName}.json`);

    const whisperExe = path.join(app.getAppPath(), 'src', 'whisper', 'whisper.exe');
    const modelPath = path.join(app.getAppPath(), 'src', 'whisper', model);

    try {
      let finalWavPath = wavPath;

      // ✅ Convert video/audio formats to WAV
      if (['.mp4', '.mov', '.mkv'].includes(ext)) {
        finalWavPath = await extractAudioWav(buffer, fileName, outputDir); // <- this now RETURNS the path
      } else {
        fs.writeFileSync(wavPath, buffer);
      }

      const waitForFile = (filePath, retries = 10, interval = 300) =>
        new Promise((resolve, reject) => {
          let attempts = 0;
          const timer = setInterval(() => {
            if (fs.existsSync(filePath)) {
              clearInterval(timer);
              resolve(true);
            } else if (++attempts >= retries) {
              clearInterval(timer);
              reject(new Error('Timed out waiting for Whisper JSON output'));
            }
          }, interval);
        });

      return new Promise((resolve, reject) => {
        execFile(
          whisperExe,
          [
            '--model', modelPath,
            '--output-json',
            '--output-file', path.join(outputDir, baseName),
            finalWavPath,
          ],
          async (error, stdout, stderr) => {
            if (error) {
              console.error('❌ Whisper error:', error);
              return reject(error);
            }

            if (stderr) console.warn('⚠️ Whisper stderr:', stderr);

            try {
              await waitForFile(outputJsonPath);
            } catch (e) {
              return reject(e);
            }

            fs.readFile(outputJsonPath, 'utf8', (err, data) => {
              if (err) {
                console.error('❌ Failed to read Whisper output:', err);
                return reject(err);
              }

              try {
                const parsed = JSON.parse(data);
                resolve({ transcript: parsed, wavPath: finalWavPath });

              } catch (e) {
                console.error('❌ Failed to parse Whisper output:', data);
                reject(e);
              }
            });
          }
        );
      });
    } catch (err) {
      console.error('🔥 Failed during transcription:', err);
      throw err;
    }
  });

  ipcMain.handle('save-xml-to-path', async (event, filePath, xmlContent) => {
    const fs = require('fs');
    try {
      fs.writeFileSync(filePath, xmlContent, 'utf8');
      return filePath;
    } catch (err) {
      console.error('❌ Failed to save XML to path:', err);
      throw err;
    }
  });


  ipcMain.handle('select-export-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select Export Folder',
      properties: ['openDirectory'],
    });

    if (canceled || !filePaths.length) return null;
    return filePaths[0];
  });

  ipcMain.handle('save-transcript-file', async (_, path, content) => {
    const fs = require('fs');
    fs.writeFileSync(path, content, 'utf8');
    return path;
  });

  ipcMain.handle('show-save-dialog', async (_, options) => {
    console.log('📁 show-save-dialog called with:', options); // <--- ADD THIS
    const result = await dialog.showSaveDialog(options);
    return result;
  });

  ipcMain.handle('show-open-dialog', async (_, options) => {
    console.log('📁 show-open-dialog called with:', options);
    const result = await dialog.showOpenDialog(options);
    return result;
  });

  ipcMain.handle('read-font-file', async (_, fontPath) => {
    try {
      const fs = require('fs');
      const fontBuffer = fs.readFileSync(fontPath);
      const base64Font = fontBuffer.toString('base64');
      return { success: true, data: base64Font };
    } catch (error) {
      console.error('Error reading font file:', error);
      return { success: false, error: error.message };
    }
  });


  ipcMain.handle('save-project', async (event, data) => {
    const { filePath, canceled } = await dialog.showSaveDialog({
      filters: [{ name: 'ClipWizard Project', extensions: ['wizard'] }],
      defaultPath: `${(data.videoFileName || 'Untitled')?.replace(/\.[^/.]+$/, '')}.wizard`,

    });
    if (canceled || !filePath) return null;

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
  });

  // Load project from .wizard file
  ipcMain.handle('load-project', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      filters: [{ name: 'ClipWizard Project', extensions: ['wizard'] }],
      properties: ['openFile']
    });
    if (canceled || !filePaths.length) return null;

    const raw = fs.readFileSync(filePaths[0], 'utf8');
    return JSON.parse(raw);
  });

  ipcMain.handle('read-file-as-blob', async (_, filePath) => {
    const data = fs.readFileSync(filePath);
    return data.buffer; // or Buffer.from(data)
  });

  ipcMain.handle('select-video-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Select a video file',
      filters: [{ name: 'Video Files', extensions: ['mp4', 'mov', 'mkv', 'webm'] }],
      properties: ['openFile']
    });

    if (canceled || !filePaths.length) return null;
    return filePaths[0];
  });

  ipcMain.handle('read-video-buffer', async (_, filePath) => {
    const buffer = fs.readFileSync(filePath);
    return buffer;
  });

  ipcMain.handle('save-xml-file', async (event, defaultFileName, xmlContent) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export XML Timeline',
      defaultPath: defaultFileName.endsWith('.xml') ? defaultFileName : `${defaultFileName}.xml`,
      filters: [{ name: 'Premiere XML', extensions: ['xml'] }]
    });

    if (canceled || !filePath) return null;

    fs.writeFileSync(filePath, xmlContent, 'utf8');
    return filePath;
  });
  
  ipcMain.handle('get-video-resolution', async (event, filePath) => {
    console.log('[get-video-resolution] ffprobe path:', ffmpeg._getFfprobePath?.());
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error('[get-video-resolution] ffprobe error:', err);
          return reject(err);
        }
        const stream = metadata.streams.find(s => s.width && s.height);
        if (stream) {
          resolve({ width: stream.width, height: stream.height });
        } else {
          console.warn('[get-video-resolution] No valid video stream found');
          resolve(null);
        }
      });
    });
  });

  const { spawn } = require('child_process');

  ipcMain.handle('detect-scenes', async (event, videoPath) => {
    return new Promise((resolve, reject) => {
      const args = [
        '-i', videoPath,
        'detect-threshold',
        'list-scenes',
        '--no-output-file',
      ];

      const proc = spawn('python', ['-m', 'scenedetect', ...args]);

      let output = '';
      proc.stdout.on('data', data => output += data.toString());
      proc.stderr.on('data', data => console.warn('[SceneDetect]', data.toString()));

      proc.on('close', () => {
        console.log('SceneDetect output:', output); // <-- log full output for debugging
        // Parse table rows with pipes for scene start/end times
        const sceneRegex = /^\s*\|\s*\d+\s*\|\s*\d+\s*\|\s*([\d:.]+)\s*\|\s*\d+\s*\|\s*([\d:.]+)\s*\|/gm;
        const scenes = [];
        let match;
        let idx = 0;
        while ((match = sceneRegex.exec(output)) !== null) {
          const [ , start, end ] = match;
          scenes.push({
            id: `scene-${idx}`,
            start: timeToSeconds(start),
            end: timeToSeconds(end),
            label: `Scene ${idx + 1}`,
            sourceType: 'scene',
          });
          idx++;
        }
        resolve(scenes);
      });

      proc.on('error', err => {
        console.error('❌ Scene detection failed:', err);
        reject(err);
      });
    });
  });

  function timeToSeconds(timecode) {
    const [hh, mm, ss] = timecode.split(':');
    return parseFloat(hh) * 3600 + parseFloat(mm) * 60 + parseFloat(ss);
  }


  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// SINGLE CUT (unified)
ipcMain.handle('export-single-cut', async (event, inputPath, inputName, clips, outputPath) => {
  try {
    if (!outputPath) throw new Error('No output path provided.');
    const adjusted = clips.map(c => ({
      adjustedStart: c.start + (c.startOffset || 0),
      adjustedEnd:   c.end   + (c.endOffset   || 0),
      cropData: c.cropData || [],
      captionData: c.captionData || {},
    }));
    const { exportClips, exportClipsWithEffects, concatClips } = require('./main/exportClips');
    const { clipPaths } = await exportClips(inputPath, inputName, adjusted);
    await concatClips(clipPaths, outputPath);
    return outputPath;
  } catch (err) {
    console.error('❌ export-single-cut failed:', err);
    throw err;
  }
});

// SINGLE CUT with output framing / effects (same unified function)
ipcMain.handle('export-single-cut-with-effects', async (event, inputPath, inputName, clips, outputPath, outputResolution) => {
  try {
    if (!outputPath) throw new Error('No output path provided.');
    const adjusted = clips.map(c => ({
      adjustedStart: c.start + (c.startOffset || 0),
      adjustedEnd:   c.end   + (c.endOffset   || 0),
      cropData: c.cropData || [],
      captionData: c.captionData || {},
    }));
    const { exportClipsUnified, concatClips } = require('./main/exportClips');
    const { clipPaths } = await exportClipsUnified(inputPath, inputName, adjusted, outputResolution);
    await concatClips(clipPaths, outputPath);
    return outputPath;
  } catch (err) {
    console.error('❌ export-single-cut-with-effects failed:', err);
    throw err;
  }
});
