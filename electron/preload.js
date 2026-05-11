// Preload script for Electron
// This script runs before the renderer process loads
// Use this to expose safe APIs to the renderer process

const { contextBridge, ipcRenderer } = require('electron');

// Expose file system APIs to renderer
contextBridge.exposeInMainWorld('electron', {
  // File system operations
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke('fs:deleteFile', filePath),
  copyFile: (sourcePath, destPath) => ipcRenderer.invoke('fs:copyFile', sourcePath, destPath),
  getFileStats: (filePath) => ipcRenderer.invoke('fs:getFileStats', filePath),
  checkAccess: (dirPath) => ipcRenderer.invoke('fs:checkAccess', dirPath),
  scanForTrailers: (directory, baseFilename) => ipcRenderer.invoke('fs:scanForTrailers', directory, baseFilename),
  scanForSubtitles: (directory, baseFilename) => ipcRenderer.invoke('fs:scanForSubtitles', directory, baseFilename),
  openFile: (filePath) => ipcRenderer.invoke('fs:openFile', filePath),
  
  // FFmpeg operations
  ffprobe: (mediaFilePath) => ipcRenderer.invoke('ffprobe', mediaFilePath),
  ffmpegExtractSubtitle: (mediaFilePath, subtitleIndex, outputPath, outputFormat) => 
    ipcRenderer.invoke('ffmpegExtractSubtitle', mediaFilePath, subtitleIndex, outputPath, outputFormat),
  ffmpegRemoveSubtitles: (mediaFilePath, outputPath, removeAll, streamIndices) => 
    ipcRenderer.invoke('ffmpegRemoveSubtitles', mediaFilePath, outputPath, removeAll, streamIndices),
  ffmpegEmbedSubtitle: (mediaFilePath, subtitleFilePath, outputPath, options) => 
    ipcRenderer.invoke('ffmpegEmbedSubtitle', mediaFilePath, subtitleFilePath, outputPath, options),
  
  // Subtitle download and extraction
  downloadAndExtractSubtitle: (params) => ipcRenderer.invoke('subtitle:downloadAndExtract', params),
  
  // Embedded metadata operations
  readEmbeddedMetadata: (filePath) => ipcRenderer.invoke('metadata:readEmbedded', filePath),
  writeEmbeddedMetadata: (filePath, metadata) => ipcRenderer.invoke('metadata:writeEmbedded', filePath, metadata),
  
  // YouTube download
  downloadYouTubeVideo: (videoUrl, outputPath, quality) => ipcRenderer.invoke('youtube:download', videoUrl, outputPath, quality),
  on: (channel, callback) => {
    // Whitelist channels that renderer can listen to
    const validChannels = ['youtube:progress'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },
  
  // Binary management
  binaries: {
    getVersion: () => ipcRenderer.invoke('binaries:getVersion'),
    checkUpdate: () => ipcRenderer.invoke('binaries:checkUpdate'),
    update: () => ipcRenderer.invoke('binaries:update'),
    getPaths: () => ipcRenderer.invoke('binaries:getPaths'),
  },
  
  // Settings operations (stored in %APPDATA%\aio-media-manager)
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    delete: (key) => ipcRenderer.invoke('settings:delete', key),
    getPath: () => ipcRenderer.invoke('settings:getPath'),
    debug: () => ipcRenderer.invoke('settings:debug'),
  },

  // Window controls for frameless window
  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    unmaximize: () => ipcRenderer.invoke('window:unmaximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  // HTTP requests (bypasses CORS restrictions)
  fetch: (url, options) => ipcRenderer.invoke('http:fetch', url, options),
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
});
