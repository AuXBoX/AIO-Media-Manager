const { app, BrowserWindow, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { constants } = require('fs');
const { binaryManager } = require('./binaryManager');

// Force consistent app name for userData path
// This ensures settings persist between dev and production builds
app.setPath('userData', path.join(app.getPath('appData'), 'aio-media-manager'));

// Set app user model ID for Windows taskbar icon
if (process.platform === 'win32') {
  app.setAppUserModelId('com.aiomedia.manager');
}

let mainWindow;
let binaryPaths = null;

// Settings storage path in %APPDATA%\aio-media-manager
const SETTINGS_DIR = path.join(app.getPath('userData'), 'settings');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'app-settings.json');
const STORE_FILE = path.join(SETTINGS_DIR, 'app-store.json');

// Write queue to prevent race conditions
const writeQueue = {
  settings: Promise.resolve(),
  store: Promise.resolve()
};

/**
 * Queue a write operation to prevent race conditions
 */
function queueWrite(fileType, writeOperation) {
  const queue = fileType === 'store' ? 'store' : 'settings';
  writeQueue[queue] = writeQueue[queue]
    .then(() => writeOperation())
    .catch((error) => {
      console.error(`[Settings] Queued write failed for ${fileType}:`, error);
      throw error;
    });
  return writeQueue[queue];
} // Separate file for Zustand store

// Lazy load metadata modules only when needed
let parseFile, NodeID3, ffmetadata;

function loadMetadataModules() {
  if (!parseFile) {
    try {
      parseFile = require('music-metadata').parseFile;
      NodeID3 = require('node-id3');
      ffmetadata = require('ffmetadata');
      console.log('Metadata modules loaded successfully');
    } catch (error) {
      console.error('Failed to load metadata modules:', error);
      throw error;
    }
  }
}

// Ensure settings directory exists
async function ensureSettingsDir() {
  try {
    await fs.mkdir(SETTINGS_DIR, { recursive: true });
    console.log('[Settings] Directory ensured:', SETTINGS_DIR);
    console.log('[Settings] Settings file path:', SETTINGS_FILE);
  } catch (error) {
    console.error('[Settings] Failed to create settings directory:', error);
  }
}

// Initialize settings directory on startup
app.whenReady().then(async () => {
  await ensureSettingsDir();
  console.log('[Settings] App userData path:', app.getPath('userData'));
  
  // Initialize binary manager
  try {
    console.log('[Main] Initializing binary manager...');
    binaryPaths = await binaryManager.initialize();
    console.log('[Main] Binary paths initialized:', binaryPaths);
    
    // Check for yt-dlp updates
    const updateCheck = await binaryManager.checkForYtDlpUpdate();
    if (updateCheck.updateAvailable) {
      console.log('[Main] yt-dlp update available:', updateCheck.latestVersion);
    }
  } catch (error) {
    console.error('[Main] Failed to initialize binaries:', error);
    
    // Show error dialog
    const { dialog } = require('electron');
    dialog.showErrorBox(
      'Binary Initialization Failed',
      `Failed to download required binaries (yt-dlp, ffmpeg).\n\n` +
      `Error: ${error.message}\n\n` +
      `The application will continue, but some features (YouTube trailer download) may not work.\n\n` +
      `You can try updating binaries from Settings > Binaries.`
    );
  }
  
  // Create window after binaries are initialized
  createWindow();
});

function createWindow() {
  // Use icon.png from root directory
  const iconPath = path.join(__dirname, '../icon.png');
  
  // Create native image for the icon
  const icon = nativeImage.createFromPath(iconPath);
  console.log('[Main] Icon path:', iconPath);
  console.log('[Main] Icon loaded:', !icon.isEmpty(), 'Size:', icon.getSize());
  
  // For Windows, also set the app user model ID with the icon
  if (process.platform === 'win32' && !icon.isEmpty()) {
    app.setAppUserModelId('com.aiomedia.manager');
  }
  
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    frame: false, // Remove the default window frame and menu
    icon: icon, // Set window icon using nativeImage
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize(); // Maximize instead of fullscreen to show taskbar
  });

  // Load the app
  if (process.env.VITE_DEV_SERVER_URL) {
    // Development mode
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode
    // When using asar, the path resolution works correctly
    const indexPath = path.join(__dirname, '../dist/index.html');
    
    console.log('Is packaged:', app.isPackaged);
    console.log('Loading from:', indexPath);
    console.log('__dirname:', __dirname);
    console.log('App path:', app.getAppPath());
    console.log('Resource path:', process.resourcesPath);
    
    mainWindow.loadFile(indexPath);
    
    // Enable DevTools in production with F12 or Ctrl+Shift+I
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
        mainWindow.webContents.toggleDevTools();
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for settings storage (stored in %APPDATA%\aio-media-manager)
ipcMain.handle('settings:get', async (event, key) => {
  await ensureSettingsDir();
  
  // Determine which file to use based on the key FIRST
  const isStoreKey = key === 'aio-media-manager-storage';
  const settingsFile = isStoreKey ? STORE_FILE : SETTINGS_FILE;
  
  console.log('[Settings] GET - key:', key, '| using:', isStoreKey ? 'STORE' : 'SETTINGS');
  
  try {
    const data = await fs.readFile(settingsFile, 'utf-8');
    const settings = JSON.parse(data);
    
    console.log('[Settings] Read from', isStoreKey ? 'store' : 'settings', '- found:', !!settings);
    
    // If no key provided, return all settings
    if (key === undefined || key === null) {
      return settings;
    }
    
    // Return specific key
    return settings[key] || null;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('[Settings] No', isStoreKey ? 'store' : 'settings', 'file found (first run)');
      // File doesn't exist yet, return null or empty object
      return key === undefined || key === null ? {} : null;
    }
    
    // Handle corrupted JSON
    if (error instanceof SyntaxError) {
      console.error('[Settings] Corrupted', isStoreKey ? 'store' : 'settings', 'file detected, backing up');
      try {
        // Backup the corrupted file
        const backupFile = settingsFile + '.corrupted.' + Date.now();
        await fs.rename(settingsFile, backupFile);
        console.log('[Settings] Backed up corrupted file to:', backupFile);
      } catch (backupError) {
        console.error('[Settings] Failed to backup corrupted file:', backupError);
      }
      // Return empty settings
      return key === undefined || key === null ? {} : null;
    }
    
    console.error('[Settings] Error reading settings:', error);
    throw new Error(`Failed to read settings: ${error.message}`);
  }
});

ipcMain.handle('settings:set', async (event, key, value) => {
  await ensureSettingsDir();
  
  try {
    console.log('[Settings] SET - key type:', typeof key, '| value type:', typeof value);
    
    // Determine which file to use FIRST, before any processing
    let settingsFile = SETTINGS_FILE;
    let isStoreKey = false;
    
    // Check if this is a Zustand store update
    if (typeof key === 'string' && key === 'aio-media-manager-storage') {
      settingsFile = STORE_FILE;
      isStoreKey = true;
    } else if (typeof key === 'object' && key !== null && 'aio-media-manager-storage' in key) {
      settingsFile = STORE_FILE;
      isStoreKey = true;
    }
    
    console.log('[Settings] SET - using:', isStoreKey ? 'STORE' : 'SETTINGS', '| file:', settingsFile);
    
    // Queue the write operation to prevent race conditions
    return await queueWrite(isStoreKey ? 'store' : 'settings', async () => {
      let settings = {};
      
      // Read existing settings from the appropriate file
      try {
        const data = await fs.readFile(settingsFile, 'utf-8');
        settings = JSON.parse(data);
        console.log('[Settings] Loaded existing', isStoreKey ? 'store' : 'settings', 'with', Object.keys(settings).length, 'keys');
      } catch (error) {
        // File doesn't exist yet or is corrupted, start with empty object
        if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) {
          throw error;
        }
        if (error instanceof SyntaxError) {
          console.error('[Settings] ✗ Corrupted', isStoreKey ? 'store' : 'settings', 'file detected');
          console.error('[Settings] ✗ Parse error:', error.message);
          
          // Read the file content to log what's corrupted
          try {
            const corruptedData = await fs.readFile(settingsFile, 'utf-8');
            console.error('[Settings] ✗ Corrupted content (first 500 chars):', corruptedData.substring(0, 500));
            
            // Try to parse again after a short delay (might be a race condition)
            console.log('[Settings] Retrying read after 100ms...');
            await new Promise(resolve => setTimeout(resolve, 100));
            const retryData = await fs.readFile(settingsFile, 'utf-8');
            settings = JSON.parse(retryData);
            console.log('[Settings] ✓ Retry successful, loaded', Object.keys(settings).length, 'keys');
          } catch (retryError) {
            console.error('[Settings] ✗ Retry failed:', retryError);
            
            // Only backup if retry also fails
            if (retryError instanceof SyntaxError) {
              try {
                const backupFile = settingsFile + '.corrupted.' + Date.now();
                await fs.rename(settingsFile, backupFile);
                console.log('[Settings] Backed up corrupted file to:', backupFile);
              } catch (backupError) {
                console.error('[Settings] Failed to backup:', backupError);
              }
            }
          }
        } else if (error.code === 'ENOENT') {
          console.log('[Settings] No existing', isStoreKey ? 'store' : 'settings', 'file (first run)');
        }
      }
      
      // Determine if this is a bulk update or single key update
      // If value is undefined and key is an object, it's a bulk update with only one argument
      const isBulkUpdate = (typeof key === 'object' && key !== null && value === undefined) || 
                           (typeof key === 'object' && key !== null && typeof value === 'object');
      
      console.log('[Settings] Is bulk update?', isBulkUpdate);
      
      // Update settings
      if (isBulkUpdate) {
        // Bulk update - merge with existing settings, filtering out undefined values
        const updates = key; // The settings object is passed as the first parameter
        console.log('[Settings] Bulk update with', Object.keys(updates).length, 'keys');
        
        // Log each key-value pair to find the problematic one
        for (const [k, v] of Object.entries(updates)) {
          const valueType = typeof v;
          const valueDesc = v === undefined ? 'undefined' : v === null ? 'null' : valueType === 'object' ? JSON.stringify(v).substring(0, 50) : String(v);
          console.log(`[Settings]   ${k}: ${valueType} = ${valueDesc}`);
        }
        
        const cleanedUpdates = {};
        for (const [k, v] of Object.entries(updates)) {
          if (v !== undefined && v !== null) {
            cleanedUpdates[k] = v;
          } else {
            console.warn('[Settings] Skipping undefined/null value for key:', k);
          }
        }
        settings = { ...settings, ...cleanedUpdates };
        console.log('[Settings] Merged settings now has', Object.keys(settings).length, 'keys');
      } else {
        // Single key update
        if (key === null || key === undefined) {
          throw new Error('Settings key cannot be null or undefined');
        }
        if (value === undefined || value === null) {
          console.warn('[Settings] Attempted to set undefined/null value for key:', key);
          return false;
        }
        settings[key] = value;
        console.log('[Settings] Set single key:', key);
      }
      
      // Final validation - remove any undefined/null values that might have slipped through
      const cleanedSettings = {};
      for (const [k, v] of Object.entries(settings)) {
        if (v !== undefined && v !== null) {
          cleanedSettings[k] = v;
        } else {
          console.warn('[Settings] Filtered out undefined/null value for key:', k);
        }
      }
      
      console.log('[Settings] Final cleaned settings keys:', Object.keys(cleanedSettings));
      
      // Write back to the appropriate file
      // Simple JSON.stringify - no filtering needed since we already cleaned the settings
      let jsonString;
      try {
        jsonString = JSON.stringify(cleanedSettings, null, 2);
        // Validate that the JSON is parseable before writing
        JSON.parse(jsonString);
      } catch (stringifyError) {
        console.error('[Settings] ✗ Failed to stringify settings:', stringifyError);
        console.error('[Settings] ✗ Settings object:', cleanedSettings);
        throw new Error(`Failed to serialize settings: ${stringifyError.message}`);
      }
      
      await fs.writeFile(settingsFile, jsonString, 'utf-8');
      console.log('[Settings] ✓ Saved to:', settingsFile);
      return true;
    });
  } catch (error) {
    console.error('[Settings] Error writing settings:', error);
    throw new Error(`Failed to write settings: ${error.message}`);
  }
});

ipcMain.handle('settings:delete', async (event, key) => {
  await ensureSettingsDir();
  
  // Determine which file to use
  const isStoreKey = key === 'aio-media-manager-storage';
  const settingsFile = isStoreKey ? STORE_FILE : SETTINGS_FILE;
  
  try {
    const data = await fs.readFile(settingsFile, 'utf-8');
    const settings = JSON.parse(data);
    
    if (key) {
      delete settings[key];
      await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2), 'utf-8');
      console.log('[Settings] Deleted key:', key, 'from', isStoreKey ? 'store file' : 'settings file');
    } else {
      // Delete entire settings file
      await fs.unlink(settingsFile);
      console.log('[Settings] Deleted entire', isStoreKey ? 'store file' : 'settings file');
    }
    
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, nothing to delete
      console.log('[Settings] Nothing to delete (file does not exist)');
      return true;
    }
    console.error('[Settings] Error deleting settings:', error);
    throw new Error(`Failed to delete settings: ${error.message}`);
  }
});

ipcMain.handle('settings:getPath', async () => {
  return {
    userData: app.getPath('userData'),
    settings: SETTINGS_DIR,
    settingsFile: SETTINGS_FILE,
  };
});

ipcMain.handle('settings:debug', async () => {
  await ensureSettingsDir();
  
  try {
    // Check if file exists
    let fileExists = false;
    let fileContent = null;
    let fileSize = 0;
    
    try {
      const stats = await fs.stat(SETTINGS_FILE);
      fileExists = true;
      fileSize = stats.size;
      
      const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
      fileContent = data;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    
    return {
      paths: {
        userData: app.getPath('userData'),
        settingsDir: SETTINGS_DIR,
        settingsFile: SETTINGS_FILE,
      },
      file: {
        exists: fileExists,
        size: fileSize,
        content: fileContent,
      },
      environment: {
        isPackaged: app.isPackaged,
        appPath: app.getAppPath(),
        resourcesPath: process.resourcesPath,
      },
    };
  } catch (error) {
    console.error('[Settings] Debug error:', error);
    return {
      error: error.message,
    };
  }
});

// IPC Handlers for file system operations
ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
});

ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
  try {
    // Check if content is base64 encoded (for binary files like images)
    if (typeof content === 'string' && content.match(/^[A-Za-z0-9+/=]+$/)) {
      // Decode base64 and write as binary
      const buffer = Buffer.from(content, 'base64');
      await fs.writeFile(filePath, buffer);
    } else {
      // Write as text
      await fs.writeFile(filePath, content, 'utf-8');
    }
    return true;
  } catch (error) {
    throw new Error(`Failed to write file: ${error.message}`);
  }
});

ipcMain.handle('fs:deleteFile', async (event, filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
});

ipcMain.handle('fs:copyFile', async (event, sourcePath, destPath) => {
  try {
    await fs.copyFile(sourcePath, destPath);
    return true;
  } catch (error) {
    throw new Error(`Failed to copy file: ${error.message}`);
  }
});

ipcMain.handle('fs:selectFile', async (event, options = {}) => {
  const { dialog } = require('electron');
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: options.title || 'Select File',
      defaultPath: options.defaultPath,
      filters: options.filters || [],
      properties: ['openFile']
    });
    
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    
    return result.filePaths[0];
  } catch (error) {
    throw new Error(`Failed to select file: ${error.message}`);
  }
});

ipcMain.handle('fs:downloadFile', async (event, url, destPath) => {
  const https = require('https');
  const http = require('http');
  const fsSync = require('fs');
  
  try {
    return await new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const file = fsSync.createWriteStream(destPath);
      
      protocol.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
        
        file.on('error', (err) => {
          fsSync.unlink(destPath, () => {});
          reject(err);
        });
      }).on('error', (err) => {
        fsSync.unlink(destPath, () => {});
        reject(err);
      });
    });
  } catch (error) {
    throw new Error(`Failed to download file: ${error.message}`);
  }
});

ipcMain.handle('fs:getFileStats', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      mtimeMs: stats.mtimeMs,
      size: stats.size,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory(),
    };
  } catch (error) {
    throw new Error(`Failed to get file stats: ${error.message}`);
  }
});

ipcMain.handle('fs:checkAccess', async (event, dirPath) => {
  const result = {
    canRead: false,
    canWrite: false,
  };

  try {
    // Check read access
    await fs.access(dirPath, constants.R_OK);
    result.canRead = true;
  } catch (error) {
    // Cannot read
  }

  try {
    // Check write access
    await fs.access(dirPath, constants.W_OK);
    result.canWrite = true;
  } catch (error) {
    // Cannot write
  }

  return result;
});

// Scan for local trailer files
ipcMain.handle('fs:scanForTrailers', async (event, directory, baseFilename) => {
  try {
    const files = await fs.readdir(directory);
    const trailers = [];
    
    // Common video extensions
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
    
    // Look for files with -trailer suffix
    const trailerPatterns = [
      `${baseFilename}-trailer`,
      `${baseFilename}-Trailer`,
      `${baseFilename} - Trailer`,
      `${baseFilename} - trailer`,
    ];
    
    for (const file of files) {
      const lowerFile = file.toLowerCase();
      const fileWithoutExt = file.substring(0, file.lastIndexOf('.'));
      const ext = file.substring(file.lastIndexOf('.')).toLowerCase();
      
      // Check if it's a video file with trailer suffix
      if (videoExtensions.includes(ext)) {
        for (const pattern of trailerPatterns) {
          if (fileWithoutExt.toLowerCase().includes(pattern.toLowerCase())) {
            trailers.push(path.join(directory, file));
            break;
          }
        }
      }
    }
    
    return trailers;
  } catch (error) {
    console.error('Failed to scan for trailers:', error);
    return [];
  }
});

// Scan for local subtitle files
ipcMain.handle('fs:scanForSubtitles', async (event, directory, baseFilename) => {
  try {
    const files = await fs.readdir(directory);
    const subtitles = [];
    
    // Common subtitle extensions
    const subtitleExtensions = ['.srt', '.ass', '.ssa', '.sub', '.vtt'];
    
    for (const file of files) {
      const ext = file.substring(file.lastIndexOf('.')).toLowerCase();
      
      // Check if it's a subtitle file
      if (subtitleExtensions.includes(ext)) {
        // Check if filename starts with base filename
        if (file.toLowerCase().startsWith(baseFilename.toLowerCase())) {
          subtitles.push(file);
        }
      }
    }
    
    return subtitles;
  } catch (error) {
    console.error('Failed to scan for subtitles:', error);
    return [];
  }
});

// Open file with default application
ipcMain.handle('fs:openFile', async (event, filePath) => {
  try {
    const { shell } = require('electron');
    await shell.openPath(filePath);
    return true;
  } catch (error) {
    throw new Error(`Failed to open file: ${error.message}`);
  }
});

// Open folder in Windows Explorer
ipcMain.handle('fs:openFolder', async (event, folderPath) => {
  try {
    const { shell } = require('electron');
    await shell.openPath(folderPath);
    return true;
  } catch (error) {
    throw new Error(`Failed to open folder: ${error.message}`);
  }
});

// Download YouTube video using yt-dlp
ipcMain.handle('youtube:download', async (event, videoUrl, outputPath, quality) => {
  try {
    const { spawn } = require('child_process');
    const path = require('path');
    const fs = require('fs').promises;
    
    console.log('[YouTube] Starting download:', { videoUrl, outputPath, quality });
    console.log('[YouTube] binaryPaths object:', binaryPaths);
    
    // Use binary manager paths
    if (!binaryPaths) {
      const error = 'Binary manager not initialized. Please restart the application.';
      console.error('[YouTube] ERROR:', error);
      throw new Error(error);
    }
    
    const ytdlpPath = binaryPaths.ytdlpPath;
    const ffmpegPath = binaryPaths.ffmpegPath;
    
    console.log('[YouTube] Using yt-dlp:', ytdlpPath);
    console.log('[YouTube] Using ffmpeg:', ffmpegPath);
    
    if (!ytdlpPath || !ffmpegPath) {
      const error = `Binary paths not available. ytdlp: ${ytdlpPath}, ffmpeg: ${ffmpegPath}`;
      console.error('[YouTube] ERROR:', error);
      throw new Error('Binary paths not available. Please check Settings > Binaries.');
    }
    
    // Verify binaries exist
    const fsSync = require('fs');
    if (!fsSync.existsSync(ytdlpPath)) {
      const error = `yt-dlp not found at: ${ytdlpPath}`;
      console.error('[YouTube] ERROR:', error);
      throw new Error('yt-dlp binary not found. Please check Settings > Binaries.');
    }
    if (!fsSync.existsSync(ffmpegPath)) {
      const error = `ffmpeg not found at: ${ffmpegPath}`;
      console.error('[YouTube] ERROR:', error);
      throw new Error('ffmpeg binary not found. Please check Settings > Binaries.');
    }
    
    console.log('[YouTube] Binaries verified, proceeding with download...');
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Map quality to format selection that's less likely to be throttled
    // Use best available format up to the requested quality
    const formatMap = {
      '2160p': 'bestvideo[height<=2160][ext=mp4]+bestaudio[ext=m4a]/best[height<=2160]',
      '1440p': 'bestvideo[height<=1440][ext=mp4]+bestaudio[ext=m4a]/best[height<=1440]',
      '1080p': 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080]',
      '720p': 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]',
      '480p': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480]',
      '360p': 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360]/18',
      '240p': 'bestvideo[height<=240][ext=mp4]+bestaudio[ext=m4a]/best[height<=240]',
      '144p': 'bestvideo[height<=144][ext=mp4]+bestaudio[ext=m4a]/best[height<=144]',
    };
    
    const formatString = formatMap[quality] || formatMap['1080p'];
    
    console.log('[YouTube] Requesting quality:', quality);
    console.log('[YouTube] Format string:', formatString);
    
    // yt-dlp arguments - optimized to avoid YouTube throttling
    const args = [
      videoUrl,
      '-f', formatString,
      '--merge-output-format', 'mp4',
      '--ffmpeg-location', ffmpegPath,
      '-o', outputPath,
      '--no-playlist',
      '--progress',
      '--newline',
      // Anti-throttling measures
      '--throttled-rate', '100K',
      '--concurrent-fragments', '1',
      '--limit-rate', '10M',
      '--sleep-interval', '1',
      '--max-sleep-interval', '3',
      // Retry settings
      '--retries', '15',
      '--fragment-retries', '15',
      '--retry-sleep', '3',
      // Headers
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--referer', 'https://www.youtube.com/',
      '--add-header', 'Accept:text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      '--add-header', 'Accept-Language:en-us,en;q=0.5',
      '--add-header', 'Sec-Fetch-Mode:navigate',
      // Fallback options
      '--no-check-certificates',
      '--geo-bypass',
    ];
    
    console.log('[YouTube] Running yt-dlp...');
    console.log('[YouTube] Command:', ytdlpPath);
    console.log('[YouTube] Args:', JSON.stringify(args, null, 2));
    
    return new Promise((resolve, reject) => {
      // Use the determined yt-dlp path
      let ytdlp;
      try {
        ytdlp = spawn(ytdlpPath, args);
        console.log('[YouTube] Process spawned successfully, PID:', ytdlp.pid);
      } catch (spawnError) {
        console.error('[YouTube] Failed to spawn process:', spawnError);
        reject(spawnError);
        return;
      }
      
      let lastProgress = 0;
      let errorOutput = '';
      let downloadedInfo = '';
      let hasOutput = false;
      
      ytdlp.stdout.on('data', (data) => {
        hasOutput = true;
        const output = data.toString();
        console.log('[YouTube] stdout:', output.trim());
        
        // Capture download info
        if (output.includes('Downloaded:')) {
          downloadedInfo = output.trim();
          console.log('[YouTube]', downloadedInfo);
        }
        
        // Parse progress from yt-dlp output
        // Format: [download]  45.2% of 123.45MiB at 1.23MiB/s ETA 00:30
        const progressMatch = output.match(/\[download\]\s+(\d+\.?\d*)%/);
        if (progressMatch) {
          const percent = parseFloat(progressMatch[1]);
          if (percent > lastProgress) {
            lastProgress = percent;
            event.sender.send('youtube:progress', {
              url: videoUrl,
              percent: percent.toFixed(1),
            });
          }
        }
      });
      
      ytdlp.stderr.on('data', (data) => {
        hasOutput = true;
        const output = data.toString();
        errorOutput += output;
        // Log all stderr output to help debug
        console.error('[YouTube] stderr:', output.trim());
      });
      
      ytdlp.on('error', (error) => {
        console.error('[YouTube] Process error event:', error);
        reject(new Error(`Failed to run yt-dlp: ${error.message}`));
      });
      
      ytdlp.on('close', async (code) => {
        console.log('[YouTube] Process closed with code:', code);
        console.log('[YouTube] Had output:', hasOutput);
        
        if (code === 0) {
          console.log('[YouTube] Download complete:', outputPath);
          if (downloadedInfo) {
            console.log('[YouTube] Quality info:', downloadedInfo);
          }
          
          // Get file size
          try {
            const stats = await fs.stat(outputPath);
            resolve({
              success: true,
              path: outputPath,
              size: stats.size,
            });
          } catch (error) {
            resolve({
              success: true,
              path: outputPath,
              size: 0,
            });
          }
        } else {
          console.error('[YouTube] yt-dlp exited with code:', code);
          console.error('[YouTube] Full error output:', errorOutput);
          
          // Parse error message for better user feedback
          let errorMessage = `YouTube download failed with exit code ${code}`;
          
          if (errorOutput.includes('HTTP Error 403') || errorOutput.includes('Got error:') || errorOutput.includes('Giving up after')) {
            errorMessage = 'YouTube is throttling/blocking the download. This is a known YouTube anti-bot measure.\n\n' +
                          'Solutions:\n' +
                          '1. Try a different trailer\n' +
                          '2. Wait a few minutes and try again\n' +
                          '3. Try a lower quality (720p or 480p)\n' +
                          '4. Update yt-dlp: Settings > Binaries > Check for Updates';
          } else if (errorOutput.includes('Video unavailable')) {
            errorMessage = 'This video is unavailable or has been removed from YouTube';
          } else if (errorOutput.includes('Private video')) {
            errorMessage = 'This video is private and cannot be downloaded';
          } else if (errorOutput.includes('Sign in to confirm')) {
            errorMessage = 'This video requires age verification. Try a different trailer.';
          } else if (errorOutput.includes('Requested format is not available')) {
            errorMessage = `The requested quality (${quality}) is not available for this video. Try a lower quality.`;
          } else if (errorOutput.includes('ffmpeg') || errorOutput.includes('avconv')) {
            errorMessage = 'ffmpeg is required to merge video and audio. Please ensure ffmpeg is installed.';
          } else if (errorOutput.trim()) {
            // Include the actual error if we have it
            const firstError = errorOutput.split('\n').find(line => line.includes('ERROR') || line.includes('error'));
            errorMessage = `YouTube download failed: ${firstError || errorOutput.split('\n')[0]}`;
          }
          
          reject(new Error(errorMessage));
        }
      });
    });
  } catch (error) {
    console.error('[YouTube] Download failed:', error);
    throw new Error(`YouTube download failed: ${error.message}`);
  }
});

// Binary manager handlers
ipcMain.handle('binaries:getVersion', async () => {
  try {
    const version = await binaryManager.getYtDlpVersion();
    return { success: true, version };
  } catch (error) {
    console.error('[Binaries] Failed to get version:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('binaries:checkUpdate', async () => {
  try {
    const updateCheck = await binaryManager.checkForYtDlpUpdate();
    return { success: true, ...updateCheck };
  } catch (error) {
    console.error('[Binaries] Failed to check for updates:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('binaries:update', async () => {
  try {
    const result = await binaryManager.updateYtDlp();
    
    // Reinitialize binary paths after update
    if (result.success) {
      binaryPaths = await binaryManager.initialize();
    }
    
    return result;
  } catch (error) {
    console.error('[Binaries] Failed to update:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('binaries:getPaths', async () => {
  try {
    const paths = binaryManager.getPaths();
    return { success: true, paths };
  } catch (error) {
    console.error('[Binaries] Failed to get paths:', error);
    return { success: false, error: error.message };
  }
});

// Window controls for frameless window
ipcMain.handle('window:minimize', () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    mainWindow.maximize();
  }
});

ipcMain.handle('window:unmaximize', () => {
  if (mainWindow) {
    mainWindow.unmaximize();
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// HTTP request handler for external APIs (bypasses CORS)
ipcMain.handle('http:fetch', async (event, url, options = {}) => {
  try {
    const https = require('https');
    const http = require('http');
    const urlModule = require('url');
    
    const parsedUrl = urlModule.parse(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    return new Promise((resolve, reject) => {
      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        method: options.method || 'GET',
        headers: options.headers || {},
      };
      
      const req = protocol.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            text: data,
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      // Set timeout
      req.setTimeout(options.timeout || 30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  } catch (error) {
    console.error('HTTP fetch error:', error);
    throw error;
  }
});

// IPC Handlers for embedded metadata operations
ipcMain.handle('metadata:readEmbedded', async (event, filePath) => {
  try {
    // Load metadata modules on first use
    loadMetadataModules();
    
    const metadata = await parseFile(filePath);
    
    // Extract common metadata fields
    const embeddedMetadata = {
      // Common tags
      title: metadata.common.title,
      artist: metadata.common.artist,
      album: metadata.common.album,
      year: metadata.common.year,
      genre: metadata.common.genre || [],
      comment: metadata.common.comment ? metadata.common.comment[0] : undefined,
      
      // Audio-specific (ID3)
      trackNumber: metadata.common.track?.no,
      albumArtist: metadata.common.albumartist,
      composer: metadata.common.composer ? metadata.common.composer[0] : undefined,
      
      // Video-specific (MP4/MKV)
      description: metadata.common.description,
      director: metadata.common.director,
      cast: metadata.common.actors || [],
      
      // Additional metadata
      duration: metadata.format.duration ? Math.round(metadata.format.duration * 1000) : undefined,
      bitrate: metadata.format.bitrate,
      codec: metadata.format.codec,
      container: metadata.format.container,
    };
    
    return embeddedMetadata;
  } catch (error) {
    throw new Error(`Failed to read embedded metadata: ${error.message}`);
  }
});

ipcMain.handle('metadata:writeEmbedded', async (event, filePath, metadata) => {
  try {
    // Load metadata modules on first use
    loadMetadataModules();
    
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.mp3') {
      // Write ID3 tags for MP3 files
      const tags = {
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album,
        year: metadata.year ? metadata.year.toString() : undefined,
        genre: metadata.genre ? metadata.genre.join('/') : undefined,
        comment: {
          language: 'eng',
          text: metadata.comment || '',
        },
        trackNumber: metadata.trackNumber ? metadata.trackNumber.toString() : undefined,
        performerInfo: metadata.albumArtist,
        composer: metadata.composer,
      };
      
      // Remove undefined values
      Object.keys(tags).forEach(key => {
        if (tags[key] === undefined) {
          delete tags[key];
        }
      });
      
      // Write tags (node-id3 uses callbacks, wrap in promise)
      await new Promise((resolve, reject) => {
        NodeID3.write(tags, filePath, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      return true;
    } else if (ext === '.mp4' || ext === '.m4a' || ext === '.m4v') {
      // Write MP4 metadata using ffmetadata
      const mp4Tags = {};
      
      // Map common metadata fields to MP4 atom tags
      if (metadata.title) mp4Tags.title = metadata.title;
      if (metadata.artist) mp4Tags.artist = metadata.artist;
      if (metadata.album) mp4Tags.album = metadata.album;
      if (metadata.year) mp4Tags.date = metadata.year.toString();
      if (metadata.genre && metadata.genre.length > 0) {
        mp4Tags.genre = metadata.genre.join(', ');
      }
      if (metadata.comment) mp4Tags.comment = metadata.comment;
      if (metadata.trackNumber) mp4Tags.track = metadata.trackNumber.toString();
      if (metadata.albumArtist) mp4Tags.album_artist = metadata.albumArtist;
      if (metadata.composer) mp4Tags.composer = metadata.composer;
      
      // Video-specific tags
      if (metadata.description) mp4Tags.description = metadata.description;
      if (metadata.director) mp4Tags.director = metadata.director;
      if (metadata.cast && metadata.cast.length > 0) {
        mp4Tags.cast = metadata.cast.join(', ');
      }
      
      // Write metadata using ffmetadata (wraps ffmpeg)
      await new Promise((resolve, reject) => {
        ffmetadata.write(filePath, mp4Tags, (err) => {
          if (err) {
            reject(new Error(`ffmetadata write failed: ${err.message}`));
          } else {
            resolve();
          }
        });
      });
      
      return true;
    } else {
      throw new Error(`Unsupported file format: ${ext}`);
    }
  } catch (error) {
    throw new Error(`Failed to write embedded metadata: ${error.message}`);
  }
});

// App lifecycle
// Note: Window creation is handled in the app.whenReady() handler above (after binary initialization)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// FFmpeg operations for subtitle management
let ffmpeg;

function loadFFmpeg() {
  if (!ffmpeg) {
    try {
      ffmpeg = require('fluent-ffmpeg');
      console.log('FFmpeg module loaded successfully');
    } catch (error) {
      console.error('Failed to load FFmpeg module:', error);
      throw error;
    }
  }
}

// Get embedded subtitles using FFprobe
ipcMain.handle('ffprobe', async (event, mediaFilePath) => {
  try {
    loadFFmpeg();
    
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(mediaFilePath, (err, metadata) => {
        if (err) {
          console.error('[FFprobe] Error:', err);
          reject(new Error(`FFprobe failed: ${err.message}`));
          return;
        }
        
        // Return streams array
        resolve(metadata.streams || []);
      });
    });
  } catch (error) {
    console.error('[FFprobe] Failed:', error);
    throw new Error(`FFprobe failed: ${error.message}`);
  }
});

// Extract subtitle from video file
ipcMain.handle('ffmpegExtractSubtitle', async (event, mediaFilePath, subtitleIndex, outputPath, outputFormat) => {
  try {
    loadFFmpeg();
    
    console.log('[FFmpeg] Extracting subtitle:', { mediaFilePath, subtitleIndex, outputPath, outputFormat });
    
    return new Promise((resolve, reject) => {
      const command = ffmpeg(mediaFilePath);
      
      // Map the subtitle stream
      command
        .outputOptions([
          `-map 0:s:${subtitleIndex}`, // Select subtitle stream by index
        ])
        .output(outputPath);
      
      // Set output format if specified
      if (outputFormat) {
        command.outputFormat(outputFormat);
      }
      
      command
        .on('start', (commandLine) => {
          console.log('[FFmpeg] Command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('[FFmpeg] Progress:', progress.percent ? `${progress.percent.toFixed(1)}%` : 'processing...');
        })
        .on('end', () => {
          console.log('[FFmpeg] Extraction complete:', outputPath);
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          console.error('[FFmpeg] Extraction error:', err);
          reject(new Error(`FFmpeg extraction failed: ${err.message}`));
        })
        .run();
    });
  } catch (error) {
    console.error('[FFmpeg] Extract failed:', error);
    throw new Error(`FFmpeg extract failed: ${error.message}`);
  }
});

// Remove subtitles from video file
ipcMain.handle('ffmpegRemoveSubtitles', async (event, mediaFilePath, outputPath, removeAll, streamIndices) => {
  try {
    loadFFmpeg();
    
    console.log('[FFmpeg] Removing subtitles:', { mediaFilePath, outputPath, removeAll, streamIndices });
    
    return new Promise((resolve, reject) => {
      const command = ffmpeg(mediaFilePath);
      
      if (removeAll) {
        // Remove all subtitle streams
        command.outputOptions([
          '-map 0', // Map all streams
          '-map -0:s', // Remove all subtitle streams
          '-c copy', // Copy without re-encoding
        ]);
      } else if (streamIndices && streamIndices.length > 0) {
        // Remove specific subtitle streams
        const mapOptions = ['-map 0', '-c copy'];
        
        // Add negative map for each stream to remove
        streamIndices.forEach(index => {
          mapOptions.push(`-map -0:s:${index}`);
        });
        
        command.outputOptions(mapOptions);
      } else {
        reject(new Error('Must specify either removeAll or streamIndices'));
        return;
      }
      
      command
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('[FFmpeg] Command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('[FFmpeg] Progress:', progress.percent ? `${progress.percent.toFixed(1)}%` : 'processing...');
        })
        .on('end', () => {
          console.log('[FFmpeg] Removal complete:', outputPath);
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          console.error('[FFmpeg] Removal error:', err);
          reject(new Error(`FFmpeg removal failed: ${err.message}`));
        })
        .run();
    });
  } catch (error) {
    console.error('[FFmpeg] Remove failed:', error);
    throw new Error(`FFmpeg remove failed: ${error.message}`);
  }
});

// Embed subtitle into video file
ipcMain.handle('ffmpegEmbedSubtitle', async (event, mediaFilePath, subtitleFilePath, outputPath, options) => {
  try {
    loadFFmpeg();
    
    console.log('[FFmpeg] Embedding subtitle:', { mediaFilePath, subtitleFilePath, outputPath, options });
    
    return new Promise((resolve, reject) => {
      const command = ffmpeg(mediaFilePath);
      
      // Add subtitle file as input
      command.input(subtitleFilePath);
      
      // Build output options
      const outputOptions = [
        '-map 0', // Map all streams from video
        '-map 1', // Map subtitle file
        '-c copy', // Copy video/audio without re-encoding
      ];
      
      // Set subtitle codec
      if (options.codec && options.codec !== 'copy') {
        outputOptions.push(`-c:s ${options.codec}`);
      } else {
        outputOptions.push('-c:s copy');
      }
      
      // Set subtitle metadata
      const metadataOptions = [];
      if (options.language) {
        metadataOptions.push(`-metadata:s:s:0 language=${options.language}`);
      }
      if (options.title) {
        metadataOptions.push(`-metadata:s:s:0 title="${options.title}"`);
      }
      
      // Set disposition flags
      if (options.default) {
        metadataOptions.push('-disposition:s:0 default');
      }
      if (options.forced) {
        metadataOptions.push('-disposition:s:0 forced');
      }
      
      command
        .outputOptions([...outputOptions, ...metadataOptions])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('[FFmpeg] Command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('[FFmpeg] Progress:', progress.percent ? `${progress.percent.toFixed(1)}%` : 'processing...');
        })
        .on('end', () => {
          console.log('[FFmpeg] Embedding complete:', outputPath);
          resolve({ success: true, outputPath });
        })
        .on('error', (err) => {
          console.error('[FFmpeg] Embedding error:', err);
          reject(new Error(`FFmpeg embedding failed: ${err.message}`));
        })
        .run();
    });
  } catch (error) {
    console.error('[FFmpeg] Embed failed:', error);
    throw new Error(`FFmpeg embed failed: ${error.message}`);
  }
});

// IPC Handler for downloading and extracting subtitle ZIP files
ipcMain.handle('subtitle:downloadAndExtract', async (event, { url, mediaFilePath, languageCode, isForced }) => {
  const AdmZip = require('adm-zip');
  const https = require('https');
  const http = require('http');
  const zlib = require('zlib');
  const os = require('os');
  
  try {
    console.log('[Subtitle] Starting download...');
    console.log('[Subtitle] URL:', url);
    console.log('[Subtitle] Target media file:', mediaFilePath);
    console.log('[Subtitle] Language:', languageCode, 'Forced:', isForced);
    
    // Download ZIP file to temp directory
    const tempZipPath = path.join(os.tmpdir(), `subtitle-${Date.now()}.zip`);
    
    await new Promise((resolve, reject) => {
      const downloadFile = (downloadUrl, redirectCount = 0) => {
        if (redirectCount > 5) {
          reject(new Error('Too many redirects'));
          return;
        }
        
        console.log('[Subtitle] Attempt', redirectCount + 1, '- Downloading from:', downloadUrl);
        
        const protocol = downloadUrl.startsWith('https') ? https : http;
        
        const options = {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/zip, application/octet-stream, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            // Don't request gzip encoding - we want the raw ZIP file
            // 'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Referer': 'https://subdl.com/',
            'Origin': 'https://subdl.com',
          }
        };
        
        protocol.get(downloadUrl, options, (response) => {
          console.log('[Subtitle] Response status:', response.statusCode);
          console.log('[Subtitle] Response headers:', JSON.stringify(response.headers, null, 2));
          
          // Handle redirects
          if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307 || response.statusCode === 308) {
            const redirectUrl = response.headers.location;
            if (!redirectUrl) {
              reject(new Error('Redirect without location header'));
              return;
            }
            console.log('[Subtitle] Following redirect to:', redirectUrl);
            
            // Handle relative redirects
            const absoluteRedirectUrl = redirectUrl.startsWith('http') 
              ? redirectUrl 
              : `https://dl.subdl.com${redirectUrl}`;
            
            downloadFile(absoluteRedirectUrl, redirectCount + 1);
            return;
          }
          
          if (response.statusCode !== 200) {
            console.error('[Subtitle] Download failed with status:', response.statusCode);
            
            // Try to read error body
            let errorBody = '';
            response.on('data', chunk => errorBody += chunk);
            response.on('end', () => {
              console.error('[Subtitle] Error response body:', errorBody);
              reject(new Error(`Download failed with status ${response.statusCode}: ${errorBody || response.statusMessage}`));
            });
            return;
          }
          
          console.log('[Subtitle] Starting file write to:', tempZipPath);
          
          // Check if response is gzip-encoded
          const isGzipped = response.headers['content-encoding'] === 'gzip';
          console.log('[Subtitle] Response is gzipped:', isGzipped);
          
          const file = require('fs').createWriteStream(tempZipPath);
          
          // If gzipped, decompress before writing
          let stream = response;
          if (isGzipped) {
            console.log('[Subtitle] Decompressing gzip stream...');
            stream = response.pipe(zlib.createGunzip());
          }
          
          stream.pipe(file);
          
          let downloadedBytes = 0;
          stream.on('data', (chunk) => {
            downloadedBytes += chunk.length;
          });
          
          file.on('finish', () => {
            file.close();
            console.log('[Subtitle] ZIP downloaded successfully:', downloadedBytes, 'bytes');
            resolve();
          });
          
          file.on('error', (err) => {
            console.error('[Subtitle] File write error:', err);
            require('fs').unlink(tempZipPath, () => {});
            reject(err);
          });
          
          stream.on('error', (err) => {
            console.error('[Subtitle] Stream error:', err);
            require('fs').unlink(tempZipPath, () => {});
            reject(err);
          });
        }).on('error', (err) => {
          console.error('[Subtitle] HTTP request error:', err);
          require('fs').unlink(tempZipPath, () => {});
          reject(err);
        });
      };
      
      downloadFile(url);
    });
    
    // Extract ZIP file
    console.log('[Subtitle] Attempting to read ZIP file...');
    
    // First, check if the file is actually a ZIP by reading the first few bytes
    const fileBuffer = await fs.readFile(tempZipPath);
    const fileHeader = fileBuffer.slice(0, 4).toString('hex');
    console.log('[Subtitle] File header (hex):', fileHeader);
    console.log('[Subtitle] File size:', fileBuffer.length, 'bytes');
    
    // ZIP files should start with 'PK' (50 4B in hex)
    if (fileHeader.substring(0, 4) !== '504b') {
      // Not a ZIP file, might be HTML error page
      const fileContent = fileBuffer.toString('utf-8', 0, Math.min(500, fileBuffer.length));
      console.error('[Subtitle] Downloaded file is not a ZIP. Content preview:', fileContent);
      throw new Error('Downloaded file is not a valid ZIP archive. SubDL may be blocking the download or the subtitle may not exist.');
    }
    
    const zip = new AdmZip(tempZipPath);
    const zipEntries = zip.getEntries();
    
    console.log('[Subtitle] ZIP contains', zipEntries.length, 'files');
    
    // Find subtitle file (srt, ass, ssa, sub, vtt)
    const subtitleExtensions = ['.srt', '.ass', '.ssa', '.sub', '.vtt'];
    const subtitleEntry = zipEntries.find(entry => {
      const ext = path.extname(entry.entryName).toLowerCase();
      return subtitleExtensions.includes(ext) && !entry.isDirectory;
    });
    
    if (!subtitleEntry) {
      throw new Error('No subtitle file found in ZIP archive');
    }
    
    console.log('[Subtitle] Found subtitle file:', subtitleEntry.entryName);
    
    // Extract subtitle content
    const subtitleContent = zip.readAsText(subtitleEntry);
    
    // Determine output path
    const mediaDir = path.dirname(mediaFilePath);
    const mediaBaseName = path.basename(mediaFilePath, path.extname(mediaFilePath));
    const subtitleExt = path.extname(subtitleEntry.entryName);
    
    // Build filename: MovieName.en.srt or MovieName.en.forced.srt
    const forcedSuffix = isForced ? '.forced' : '';
    const outputFileName = `${mediaBaseName}.${languageCode}${forcedSuffix}${subtitleExt}`;
    const outputPath = path.join(mediaDir, outputFileName);
    
    console.log('[Subtitle] Writing to:', outputPath);
    
    // Write subtitle file
    await fs.writeFile(outputPath, subtitleContent, 'utf-8');
    
    // Clean up temp ZIP file
    await fs.unlink(tempZipPath);
    
    console.log('[Subtitle] Successfully extracted and saved subtitle');
    
    return {
      success: true,
      path: outputPath,
      fileName: outputFileName,
    };
  } catch (error) {
    console.error('[Subtitle] Download and extract failed:', error);
    throw new Error(`Failed to download and extract subtitle: ${error.message}`);
  }
});

