// src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Example: send and receive messages
  send: (channel, data) => {
    ipcRenderer.send(channel, data);
  },
  on: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  }
});
