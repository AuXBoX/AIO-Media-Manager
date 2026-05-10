const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { constants } = require('fs');

// Force consistent app name for userData path
// This ensures settings persist between dev and production builds
app.setPath('userData', path.join(app.getPath('appData'), 'aio-media-manager'));

let mainWindow;

// Settings storage path in %APPDATA%\aio-media-manager
const SETTINGS_DIR = path.join(app.getPath('userData'), 'settings');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'app-settings.json');

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
app.whenReady().then(() => {
  ensureSettingsDir();
  console.log('[Settings] App userData path:', app.getPath('userData'));
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    frame: false, // Remove the default window frame and menu
    fullscreen: true, // Start in fullscreen mode
    icon: path.join(__dirname, '../build-resources/icon.png'), // Set window icon
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
  
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(data);
    
    console.log('[Settings] Read settings:', key || 'all', '- found:', !!settings);
    
    // If no key provided, return all settings
    if (key === undefined || key === null) {
      return settings;
    }
    
    // Return specific key
    return settings[key] || null;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('[Settings] No settings file found (first run)');
      // File doesn't exist yet, return null or empty object
      return key === undefined || key === null ? {} : null;
    }
    
    // Handle corrupted JSON
    if (error instanceof SyntaxError) {
      console.error('[Settings] Corrupted settings file detected, backing up and creating new one');
      try {
        // Backup the corrupted file
        const backupFile = SETTINGS_FILE + '.corrupted.' + Date.now();
        await fs.rename(SETTINGS_FILE, backupFile);
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
    let settings = {};
    
    // Read existing settings
    try {
      const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
      settings = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet or is corrupted, start with empty object
      if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        console.error('[Settings] Corrupted settings file detected during write, starting fresh');
        // Backup the corrupted file
        try {
          const backupFile = SETTINGS_FILE + '.corrupted.' + Date.now();
          await fs.rename(SETTINGS_FILE, backupFile);
          console.log('[Settings] Backed up corrupted file to:', backupFile);
        } catch (backupError) {
          console.error('[Settings] Failed to backup corrupted file:', backupError);
        }
      }
    }
    
    // Update settings
    if (typeof key === 'object') {
      // Bulk update
      settings = { ...settings, ...key };
      console.log('[Settings] Bulk update:', Object.keys(key).length, 'keys');
    } else {
      // Single key update
      settings[key] = value;
      console.log('[Settings] Set:', key);
    }
    
    // Write back to file
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    console.log('[Settings] ✓ Saved to:', SETTINGS_FILE);
    return true;
  } catch (error) {
    console.error('[Settings] Error writing settings:', error);
    throw new Error(`Failed to write settings: ${error.message}`);
  }
});

ipcMain.handle('settings:delete', async (event, key) => {
  await ensureSettingsDir();
  
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(data);
    
    if (key) {
      delete settings[key];
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
      console.log('[Settings] Deleted key:', key);
    } else {
      // Delete entire settings file
      await fs.unlink(SETTINGS_FILE);
      console.log('[Settings] Deleted entire settings file');
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

// Download YouTube video
ipcMain.handle('youtube:download', async (event, videoUrl, outputPath, quality) => {
  try {
    const ytdl = require('ytdl-core');
    const fs = require('fs');
    const path = require('path');
    
    console.log('[YouTube] Starting download:', { videoUrl, outputPath, quality });
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    await require('fs').promises.mkdir(outputDir, { recursive: true });
    
    // Get video info to check available formats
    const info = await ytdl.getInfo(videoUrl);
    
    // Find best format matching requested quality
    let format;
    const qualityMap = {
      '2160p': '137', // 4K
      '1080p': '137+140', // 1080p video + audio
      '720p': '136+140',  // 720p video + audio
      '480p': '135+140',  // 480p video + audio
      '360p': '134+140',  // 360p video + audio
    };
    
    // Try to get format with both video and audio
    const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
    
    // Find closest quality match
    if (quality === '1080p') {
      format = ytdl.chooseFormat(formats, { quality: 'highestvideo' });
    } else if (quality === '720p') {
      format = formats.find(f => f.qualityLabel === '720p') || ytdl.chooseFormat(formats, { quality: 'highestvideo' });
    } else if (quality === '480p') {
      format = formats.find(f => f.qualityLabel === '480p') || ytdl.chooseFormat(formats, { quality: 'lowestvideo' });
    } else {
      format = ytdl.chooseFormat(formats, { quality: 'highestvideo' });
    }
    
    console.log('[YouTube] Selected format:', format?.qualityLabel || 'default');
    
    // Download video
    return new Promise((resolve, reject) => {
      const stream = ytdl(videoUrl, { format });
      const writeStream = fs.createWriteStream(outputPath);
      
      let downloadedBytes = 0;
      const totalBytes = parseInt(format?.contentLength || '0', 10);
      
      stream.on('progress', (chunkLength, downloaded, total) => {
        downloadedBytes = downloaded;
        const percent = (downloaded / total) * 100;
        
        // Send progress update to renderer
        event.sender.send('youtube:progress', {
          url: videoUrl,
          downloaded,
          total,
          percent: percent.toFixed(1),
        });
        
        console.log(`[YouTube] Progress: ${percent.toFixed(1)}%`);
      });
      
      stream.on('error', (error) => {
        console.error('[YouTube] Download error:', error);
        writeStream.close();
        reject(new Error(`YouTube download failed: ${error.message}`));
      });
      
      writeStream.on('error', (error) => {
        console.error('[YouTube] Write error:', error);
        reject(new Error(`Failed to write file: ${error.message}`));
      });
      
      writeStream.on('finish', () => {
        console.log('[YouTube] Download complete:', outputPath);
        resolve({
          success: true,
          path: outputPath,
          size: downloadedBytes,
        });
      });
      
      stream.pipe(writeStream);
    });
  } catch (error) {
    console.error('[YouTube] Download failed:', error);
    throw new Error(`YouTube download failed: ${error.message}`);
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
app.whenReady().then(createWindow);

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
