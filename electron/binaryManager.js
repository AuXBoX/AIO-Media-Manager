/**
 * Binary Manager
 * Manages yt-dlp and ffmpeg binaries - checking versions, updating, etc.
 */

const { app } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class BinaryManager {
  constructor() {
    this.platform = process.platform;
    this.binariesDir = this.getBinariesDir();
    this.ytdlpPath = null;
    this.ffmpegPath = null;
  }

  /**
   * Get the binaries directory path
   */
  getBinariesDir() {
    if (app.isPackaged) {
      // Production: use app's user data folder (writable)
      return path.join(app.getPath('userData'), 'binaries');
    } else {
      // Development: use build-resources folder
      return path.join(__dirname, '../build-resources/binaries');
    }
  }

  /**
   * Get the bundled binaries directory (from extraResources)
   */
  getBundledBinariesDir() {
    if (app.isPackaged) {
      // In packaged app, extraResources are at process.resourcesPath
      return path.join(process.resourcesPath, 'binaries');
    }
    return path.join(__dirname, '../build-resources/binaries');
  }

  /**
   * Copy bundled binaries to userData if not already present
   */
  copyBundledBinaries() {
    const bundledDir = this.getBundledBinariesDir();
    const targetDir = this.binariesDir;

    console.log('[BinaryManager] Bundled binaries dir:', bundledDir);
    console.log('[BinaryManager] Target binaries dir:', targetDir);

    if (!fs.existsSync(bundledDir)) {
      console.log('[BinaryManager] No bundled binaries found at:', bundledDir);
      return;
    }

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ytdlpName = this.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const ffmpegName = this.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

    // Copy yt-dlp if not in target
    const bundledYtdlp = path.join(bundledDir, ytdlpName);
    const targetYtdlp = path.join(targetDir, ytdlpName);
    if (fs.existsSync(bundledYtdlp) && !fs.existsSync(targetYtdlp)) {
      console.log('[BinaryManager] Copying bundled yt-dlp...');
      fs.copyFileSync(bundledYtdlp, targetYtdlp);
    }

    // Copy ffmpeg if not in target
    const bundledFfmpeg = path.join(bundledDir, ffmpegName);
    const targetFfmpeg = path.join(targetDir, ffmpegName);
    if (fs.existsSync(bundledFfmpeg) && !fs.existsSync(targetFfmpeg)) {
      console.log('[BinaryManager] Copying bundled ffmpeg...');
      fs.copyFileSync(bundledFfmpeg, targetFfmpeg);
    }
  }

  /**
   * Download a file from URL with retry logic
   */
  downloadFile(url, dest, retries = 3) {
    return new Promise((resolve, reject) => {
      console.log(`[BinaryManager] Downloading ${url}...`);
      
      const attemptDownload = (attemptsLeft) => {
        let file;
        
        try {
          file = fs.createWriteStream(dest);
        } catch (error) {
          console.error(`[BinaryManager] Failed to create write stream:`, error.message);
          if (attemptsLeft > 0) {
            console.log(`[BinaryManager] Retrying... (${attemptsLeft} attempts left)`);
            return setTimeout(() => attemptDownload(attemptsLeft - 1), 1000);
          } else {
            return reject(error);
          }
        }
        
        let downloadedBytes = 0;
        
        const request = https.get(url, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 303) {
            // Follow redirect
            try {
              file.close();
              if (fs.existsSync(dest)) fs.unlinkSync(dest);
            } catch (err) {
              console.log(`[BinaryManager] Cleanup error (non-fatal):`, err.message);
            }
            return this.downloadFile(response.headers.location, dest, retries).then(resolve).catch(reject);
          }
          
          if (response.statusCode !== 200) {
            try {
              file.close();
              if (fs.existsSync(dest)) fs.unlinkSync(dest);
            } catch (err) {
              console.log(`[BinaryManager] Cleanup error (non-fatal):`, err.message);
            }
            return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          }
          
          const totalBytes = parseInt(response.headers['content-length'], 10);
          console.log(`[BinaryManager] File size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
          
          response.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (totalBytes) {
              const percent = ((downloadedBytes / totalBytes) * 100).toFixed(1);
              if (downloadedBytes % (1024 * 1024) < chunk.length) {
                console.log(`[BinaryManager] Progress: ${percent}%`);
              }
            }
          });
          
          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            console.log(`[BinaryManager] Downloaded to ${dest}`);
            
            // Verify file size
            const stats = fs.statSync(dest);
            if (totalBytes && stats.size !== totalBytes) {
              console.error(`[BinaryManager] File size mismatch: expected ${totalBytes}, got ${stats.size}`);
              try {
                if (fs.existsSync(dest)) fs.unlinkSync(dest);
              } catch (err) {
                console.log(`[BinaryManager] Cleanup error (non-fatal):`, err.message);
              }
              
              if (attemptsLeft > 0) {
                console.log(`[BinaryManager] Retrying... (${attemptsLeft} attempts left)`);
                return attemptDownload(attemptsLeft - 1);
              } else {
                return reject(new Error('Download incomplete after all retries'));
              }
            }
            
            resolve();
          });
          
          file.on('error', (err) => {
            try {
              file.close();
              if (fs.existsSync(dest)) fs.unlinkSync(dest);
            } catch (cleanupErr) {
              console.log(`[BinaryManager] Cleanup error (non-fatal):`, cleanupErr.message);
            }
            
            if (attemptsLeft > 0) {
              console.log(`[BinaryManager] Download error, retrying... (${attemptsLeft} attempts left)`);
              return attemptDownload(attemptsLeft - 1);
            } else {
              reject(err);
            }
          });
        });
        
        request.on('error', (err) => {
          try {
            file.close();
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
          } catch (cleanupErr) {
            console.log(`[BinaryManager] Cleanup error (non-fatal):`, cleanupErr.message);
          }
          
          if (attemptsLeft > 0) {
            console.log(`[BinaryManager] Request error, retrying... (${attemptsLeft} attempts left)`);
            return attemptDownload(attemptsLeft - 1);
          } else {
            reject(err);
          }
        });
        
        request.setTimeout(120000, () => {
          request.destroy();
          try {
            file.close();
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
          } catch (cleanupErr) {
            console.log(`[BinaryManager] Cleanup error (non-fatal):`, cleanupErr.message);
          }
          
          if (attemptsLeft > 0) {
            console.log(`[BinaryManager] Timeout, retrying... (${attemptsLeft} attempts left)`);
            return attemptDownload(attemptsLeft - 1);
          } else {
            reject(new Error('Download timeout'));
          }
        });
      };
      
      attemptDownload(retries);
    });
  }

  /**
   * Initialize binary paths
   */
  async initialize() {
    console.log('[BinaryManager] Initializing...');
    console.log('[BinaryManager] Binaries directory:', this.binariesDir);

    // Ensure binaries directory exists
    if (!fs.existsSync(this.binariesDir)) {
      fs.mkdirSync(this.binariesDir, { recursive: true });
    }

    // Copy bundled binaries to userData (first run only)
    this.copyBundledBinaries();

    // Set binary paths
    const ytdlpName = this.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const ffmpegName = this.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

    this.ytdlpPath = path.join(this.binariesDir, ytdlpName);
    this.ffmpegPath = path.join(this.binariesDir, ffmpegName);

    // Check if binaries exist
    const ytdlpExists = fs.existsSync(this.ytdlpPath);
    const ffmpegExists = fs.existsSync(this.ffmpegPath);

    console.log('[BinaryManager] yt-dlp exists:', ytdlpExists);
    console.log('[BinaryManager] ffmpeg exists:', ffmpegExists);

    // Download missing binaries
    if (!ytdlpExists) {
      console.log('[BinaryManager] yt-dlp not found, downloading...');
      try {
        await this.downloadYtDlp();
      } catch (error) {
        console.error('[BinaryManager] Failed to download yt-dlp:', error.message);
        // Don't throw - allow app to continue without yt-dlp
      }
    }

    if (!ffmpegExists && this.platform === 'win32') {
      console.log('[BinaryManager] ffmpeg not found, downloading...');
      try {
        await this.downloadFFmpeg();
      } catch (error) {
        console.error('[BinaryManager] Failed to download ffmpeg:', error.message);
        // Don't throw - allow app to continue without ffmpeg
      }
    }

    return {
      ytdlpPath: this.ytdlpPath,
      ffmpegPath: this.ffmpegPath,
    };
  }

  /**
   * Get current yt-dlp version
   */
  async getYtDlpVersion() {
    if (!fs.existsSync(this.ytdlpPath)) {
      return null;
    }

    try {
      const output = execSync(`"${this.ytdlpPath}" --version`, { encoding: 'utf8' });
      return output.trim();
    } catch (error) {
      console.error('[BinaryManager] Failed to get yt-dlp version:', error);
      return null;
    }
  }

  /**
   * Check for yt-dlp updates
   */
  async checkForYtDlpUpdate() {
    try {
      const currentVersion = await this.getYtDlpVersion();
      const latestVersion = await this.getLatestYtDlpVersion();

      console.log('[BinaryManager] Current yt-dlp version:', currentVersion);
      console.log('[BinaryManager] Latest yt-dlp version:', latestVersion);

      if (!currentVersion) {
        return { updateAvailable: true, currentVersion: null, latestVersion };
      }

      // Compare versions (simple string comparison works for yt-dlp's date-based versions)
      const updateAvailable = currentVersion !== latestVersion;

      return {
        updateAvailable,
        currentVersion,
        latestVersion,
      };
    } catch (error) {
      console.error('[BinaryManager] Failed to check for updates:', error);
      return { updateAvailable: false, error: error.message };
    }
  }

  /**
   * Get latest yt-dlp version from GitHub
   */
  async getLatestYtDlpVersion() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/yt-dlp/yt-dlp/releases/latest',
        headers: {
          'User-Agent': 'AIO-Media-Manager',
        },
      };

      https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const release = JSON.parse(data);
            // yt-dlp version is the tag name without the 'v' prefix
            const version = release.tag_name || release.name;
            resolve(version);
          } catch (error) {
            reject(error);
          }
        });
      }).on('error', reject);
    });
  }

  /**
   * Update yt-dlp to latest version
   */
  async updateYtDlp() {
    console.log('[BinaryManager] Updating yt-dlp...');

    try {
      // Backup current version
      if (fs.existsSync(this.ytdlpPath)) {
        const backupPath = `${this.ytdlpPath}.backup`;
        fs.copyFileSync(this.ytdlpPath, backupPath);
        console.log('[BinaryManager] Backed up current version');
      }

      // Download new version
      await this.downloadYtDlp();

      // Verify new version works
      const newVersion = await this.getYtDlpVersion();
      if (!newVersion) {
        throw new Error('Failed to verify new version');
      }

      console.log('[BinaryManager] Successfully updated to version:', newVersion);

      // Remove backup
      const backupPath = `${this.ytdlpPath}.backup`;
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
      }

      return { success: true, version: newVersion };
    } catch (error) {
      console.error('[BinaryManager] Update failed:', error);

      // Restore backup if it exists
      const backupPath = `${this.ytdlpPath}.backup`;
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, this.ytdlpPath);
        fs.unlinkSync(backupPath);
        console.log('[BinaryManager] Restored backup');
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Download yt-dlp binary
   */
  async downloadYtDlp() {
    let url;

    if (this.platform === 'win32') {
      url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    } else if (this.platform === 'darwin') {
      url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
    } else {
      url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
    }

    await this.downloadFile(url, this.ytdlpPath);

    // Make executable on Unix systems
    if (this.platform !== 'win32') {
      fs.chmodSync(this.ytdlpPath, 0o755);
    }

    console.log('[BinaryManager] yt-dlp downloaded successfully');
  }

  /**
   * Download ffmpeg binary (Windows only)
   */
  async downloadFFmpeg() {
    if (this.platform !== 'win32') {
      console.log('[BinaryManager] ffmpeg auto-download only supported on Windows');
      console.log('[BinaryManager] Please install ffmpeg manually for your platform');
      return;
    }

    console.log('[BinaryManager] Downloading ffmpeg...');
    
    const url = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';
    const zipPath = path.join(this.binariesDir, 'ffmpeg.zip');
    
    // Clean up any partial downloads
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    
    await this.downloadFile(url, zipPath);
    
    // Verify ZIP file is valid before extracting
    console.log('[BinaryManager] Verifying ZIP file...');
    const zipStats = fs.statSync(zipPath);
    console.log(`[BinaryManager] ZIP file size: ${(zipStats.size / 1024 / 1024).toFixed(2)} MB`);
    
    if (zipStats.size < 1024 * 1024) {
      throw new Error('ZIP file is too small, download may be incomplete');
    }
    
    // Extract ffmpeg.exe from zip
    console.log('[BinaryManager] Extracting ffmpeg...');
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(zipPath);
      const zipEntries = zip.getEntries();
      
      console.log(`[BinaryManager] ZIP contains ${zipEntries.length} entries`);
      
      // Find ffmpeg.exe in the zip
      const ffmpegEntry = zipEntries.find(entry => entry.entryName.endsWith('bin/ffmpeg.exe'));
      if (!ffmpegEntry) {
        throw new Error('ffmpeg.exe not found in ZIP archive');
      }
      
      console.log(`[BinaryManager] Found ffmpeg at: ${ffmpegEntry.entryName}`);
      zip.extractEntryTo(ffmpegEntry, this.binariesDir, false, true);
      
      const extractedPath = path.join(this.binariesDir, path.basename(ffmpegEntry.entryName));
      fs.renameSync(extractedPath, this.ffmpegPath);
      
      console.log(`[BinaryManager] Extracted to: ${this.ffmpegPath}`);
      
    } catch (error) {
      console.error('[BinaryManager] Failed to extract ffmpeg:', error.message);
      throw error;
    } finally {
      // Clean up zip
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
    }
  }

  /**
   * Get binary paths
   */
  getPaths() {
    return {
      ytdlp: this.ytdlpPath,
      ffmpeg: this.ffmpegPath,
    };
  }
}

// Singleton instance
const binaryManager = new BinaryManager();

module.exports = { binaryManager };
