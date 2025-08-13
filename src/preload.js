const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) =>
    ipcRenderer.on(channel, (event, ...args) => func(...args)),

  transcribeBuffer: (buffer, fileName) =>
    ipcRenderer.invoke('transcribe-buffer', buffer, fileName),

  exportClips: (buffer, fileName, clips) =>
    ipcRenderer.invoke('export-clips', buffer, fileName, clips),

  selectVideoFile: () => ipcRenderer.invoke('select-video-file'),

  saveProject: (data) => ipcRenderer.invoke('save-project', data), 

  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),

  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  readFontFile: (fontPath) => ipcRenderer.invoke('read-font-file', fontPath),


  loadProject: () => ipcRenderer.invoke('load-project'),          

  readVideoBuffer: (filePath) => ipcRenderer.invoke('read-video-buffer', filePath),

  readFileAsBlob: (filePath) =>
  ipcRenderer.invoke('read-file-as-blob', filePath),

  getVideoResolution: (videoPath) => ipcRenderer.invoke('get-video-resolution', videoPath),

  selectExportFolder: () =>
  ipcRenderer.invoke('select-export-folder'),

  saveTranscriptFile: (path, content) =>
  ipcRenderer.invoke('save-transcript-file', path, content),

  exportSingleCut: (inputPath, fileName, clips, outputPath) =>
  ipcRenderer.invoke('export-single-cut', inputPath, fileName, clips, outputPath),

  exportSingleCutWithEffects: (inputPath, fileName, clips, outputPath, videoResolution) =>
    ipcRenderer.invoke('export-single-cut-with-effects', inputPath, fileName, clips, outputPath, videoResolution),



  saveXmlToPath: (filePath, xmlContent) =>
  ipcRenderer.invoke('save-xml-to-path', filePath, xmlContent),


  saveXmlFile: (defaultFileName, xmlContent) =>
    ipcRenderer.invoke('save-xml-file', defaultFileName, xmlContent),

  getWavBlobUrl: (wavPath) =>
  ipcRenderer.invoke('get-wav-buffer', wavPath).then((buffer) => {
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }),

  detectScenes: (videoPath) => ipcRenderer.invoke('detect-scenes', videoPath),



});
