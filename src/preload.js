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

  loadProject: () => ipcRenderer.invoke('load-project'),          

  readVideoBuffer: (filePath) => ipcRenderer.invoke('read-video-buffer', filePath),

  readFileAsBlob: (filePath) =>
  ipcRenderer.invoke('read-file-as-blob', filePath),

});
