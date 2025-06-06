const { app, BrowserWindow, session, ipcMain } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid'); // Make sure you npm install uuid
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = path.join(app.getAppPath(), 'src', 'whisper', 'ffmpeg.exe'); 
ffmpeg.setFfmpegPath(ffmpegPath);
const { extractAudioWav } = require('./main/extractAudioWav');



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

  ipcMain.handle('transcribe-buffer', async (event, buffer, fileName) => {
    const ext = path.extname(fileName).toLowerCase();
    const baseName = `input-${uuidv4()}`;
    const outputDir = app.getPath('userData');
    const wavPath = path.join(outputDir, `${baseName}.wav`);
    const outputJsonPath = path.join(outputDir, `${baseName}.json`);

    const whisperExe = path.join(app.getAppPath(), 'src', 'whisper', 'whisper.exe');
    const modelPath  = path.join(app.getAppPath(), 'src', 'whisper', 'ggml-base.en.bin');

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
                resolve(parsed);
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
