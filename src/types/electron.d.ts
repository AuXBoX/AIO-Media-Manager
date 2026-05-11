/**
 * TypeScript declarations for Electron APIs exposed via preload script
 */

export interface WindowControls {
  minimize: () => void;
  maximize: () => void;
  unmaximize: () => void;
  close: () => void;
}

export interface ElectronAPI {
  // Window controls
  windowControls?: WindowControls;

  // HTTP requests (bypasses CORS)
  fetch: (url: string, options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
  }) => Promise<{
    ok: boolean;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    text: string;
  }>;

  // File system operations
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<boolean>;
  deleteFile: (filePath: string) => Promise<boolean>;
  copyFile: (sourcePath: string, destPath: string) => Promise<boolean>;
  getFileStats: (filePath: string) => Promise<{
    mtimeMs: number;
    size: number;
    isFile: boolean;
    isDirectory: boolean;
  }>;
  checkAccess: (dirPath: string) => Promise<{
    canRead: boolean;
    canWrite: boolean;
  }>;
  scanForTrailers: (directory: string, baseFilename: string) => Promise<string[]>;
  scanForSubtitles: (directory: string, baseFilename: string) => Promise<string[]>;
  openFile: (filePath: string) => Promise<boolean>;
  
  // FFmpeg operations
  ffprobe: (mediaFilePath: string) => Promise<any[]>;
  ffmpegExtractSubtitle: (
    mediaFilePath: string,
    subtitleIndex: number,
    outputPath: string,
    outputFormat: string
  ) => Promise<{ success: boolean; outputPath: string }>;
  ffmpegRemoveSubtitles: (
    mediaFilePath: string,
    outputPath: string,
    removeAll: boolean,
    streamIndices: number[]
  ) => Promise<{ success: boolean; outputPath: string }>;
  ffmpegEmbedSubtitle: (
    mediaFilePath: string,
    subtitleFilePath: string,
    outputPath: string,
    options: {
      language: string;
      title?: string;
      forced: boolean;
      default: boolean;
      codec: string;
    }
  ) => Promise<{ success: boolean; outputPath: string }>;
  
  // Subtitle download and extraction
  downloadAndExtractSubtitle: (params: {
    url: string;
    mediaFilePath: string;
    languageCode: string;
    isForced: boolean;
    apiKey?: string;
  }) => Promise<{
    success: boolean;
    path: string;
    fileName: string;
  }>;

  // Embedded metadata operations
  readEmbeddedMetadata: (filePath: string) => Promise<any>;
  writeEmbeddedMetadata: (filePath: string, metadata: any) => Promise<boolean>;

  // YouTube download
  downloadYouTubeVideo: (videoUrl: string, outputPath: string, quality: string) => Promise<{
    success: boolean;
    path: string;
    size: number;
  }>;
  on: (channel: string, callback: (event: any, data: any) => void) => void;

  // Binary management
  binaries: {
    getVersion: () => Promise<{
      success: boolean;
      version?: string;
      error?: string;
    }>;
    checkUpdate: () => Promise<{
      success: boolean;
      updateAvailable?: boolean;
      currentVersion?: string;
      latestVersion?: string;
      error?: string;
    }>;
    update: () => Promise<{
      success: boolean;
      version?: string;
      error?: string;
    }>;
    getPaths: () => Promise<{
      success: boolean;
      paths?: {
        ytdlp: string;
        ffmpeg: string;
      };
      error?: string;
    }>;
  };

  // Settings operations (stored in %APPDATA%\aio-media-manager)
  settings: {
    get: (key?: string) => Promise<any>;
    set: (key: string | object, value?: any) => Promise<boolean>;
    delete: (key?: string) => Promise<boolean>;
    getPath: () => Promise<{
      userData: string;
      settings: string;
      settingsFile: string;
    }>;
    debug: () => Promise<{
      paths: {
        userData: string;
        settingsDir: string;
        settingsFile: string;
      };
      file: {
        exists: boolean;
        size: number;
        content: string | null;
      };
      environment: {
        isPackaged: boolean;
        appPath: string;
        resourcesPath: string;
      };
      error?: string;
    }>;
  };
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
