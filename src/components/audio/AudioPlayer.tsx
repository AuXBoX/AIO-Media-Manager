import { useState, useRef, useEffect, createContext, useContext, useCallback } from 'react';

// Audio track interface
export interface AudioTrack {
  ratingKey: string;
  title: string;
  artist?: string;
  album?: string;
  albumArt?: string | null;
  duration?: number; // in milliseconds
  streamUrl: string;
}

// Audio player context interface
interface AudioPlayerContextType {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: AudioTrack[];
  queueIndex: number;
  play: (track: AudioTrack) => void;
  playQueue: (tracks: AudioTrack[], startIndex?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  addToQueue: (track: AudioTrack) => void;
  clearQueue: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
}

// Provider component
export function AudioPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [queue, setQueue] = useState<AudioTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);

  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
      
      // Event listeners
      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
      });
      
      audioRef.current.addEventListener('ended', () => {
        // Auto-play next track
        if (queueIndex < queue.length - 1) {
          const nextIndex = queueIndex + 1;
          const nextTrack = queue[nextIndex];
          if (nextTrack) {
            setQueueIndex(nextIndex);
            setCurrentTrack(nextTrack);
            if (audioRef.current) {
              audioRef.current.src = nextTrack.streamUrl;
              audioRef.current.play().catch(console.error);
              setIsPlaying(true);
            }
          }
        } else {
          setIsPlaying(false);
          setCurrentTime(0);
        }
      });
      
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setIsPlaying(false);
      });
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Update audio element when track changes
  useEffect(() => {
    if (currentTrack && audioRef.current) {
      audioRef.current.src = currentTrack.streamUrl;
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [currentTrack]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const play = useCallback((track: AudioTrack) => {
    setCurrentTrack(track);
    setQueue([track]);
    setQueueIndex(0);
  }, []);

  const playQueue = useCallback((tracks: AudioTrack[], startIndex = 0) => {
    if (tracks.length === 0) return;
    setQueue(tracks);
    setQueueIndex(startIndex);
    setCurrentTrack(tracks[startIndex] ?? null);
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  }, [currentTrack]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTrack(null);
      setCurrentTime(0);
    }
  }, []);

  const next = useCallback(() => {
    if (queueIndex < queue.length - 1) {
      const nextIndex = queueIndex + 1;
      setQueueIndex(nextIndex);
      setCurrentTrack(queue[nextIndex] ?? null);
    }
  }, [queueIndex, queue]);

  const previous = useCallback(() => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      // If more than 3 seconds in, restart the track
      audioRef.current.currentTime = 0;
    } else if (queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      setQueueIndex(prevIndex);
      setCurrentTrack(queue[prevIndex] ?? null);
    }
  }, [queueIndex, queue]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(Math.max(0, Math.min(1, vol)));
  }, []);

  const addToQueue = useCallback((track: AudioTrack) => {
    setQueue(prev => [...prev, track]);
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(-1);
  }, []);

  const value: AudioPlayerContextType = {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    queueIndex,
    play,
    playQueue,
    pause,
    resume,
    stop,
    next,
    previous,
    seek,
    setVolume,
    addToQueue,
    clearQueue,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

// Format time helper
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Audio Player Bar Component (to be displayed at bottom of app)
export function AudioPlayerBar() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    pause,
    resume,
    stop,
    next,
    previous,
    seek,
    setVolume,
    queue,
    queueIndex,
  } = useAudioPlayer();

  const [showVolume, setShowVolume] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  if (!currentTrack) return null;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      seek(percent * duration);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-gray-900 border-t border-gray-700 flex items-center px-4 z-50 shadow-lg">
      {/* Track info */}
      <div className="flex items-center gap-3 w-64 flex-shrink-0">
        {currentTrack.albumArt ? (
          <img 
            src={currentTrack.albumArt} 
            alt={currentTrack.album || currentTrack.title}
            className="w-14 h-14 rounded object-cover"
          />
        ) : (
          <div className="w-14 h-14 bg-gray-700 rounded flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-medium truncate">{currentTrack.title}</p>
          {currentTrack.artist && (
            <p className="text-gray-400 text-xs truncate">{currentTrack.artist}</p>
          )}
          {currentTrack.album && (
            <p className="text-gray-500 text-xs truncate">{currentTrack.album}</p>
          )}
        </div>
      </div>

      {/* Player controls */}
      <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-2">
          {/* Previous */}
          <button
            onClick={previous}
            disabled={queueIndex <= 0 && currentTime < 3}
            className="text-gray-400 hover:text-white disabled:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={isPlaying ? pause : resume}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <svg className="w-5 h-5 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Next */}
          <button
            onClick={next}
            disabled={queueIndex >= queue.length - 1}
            className="text-gray-400 hover:text-white disabled:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>

          {/* Stop */}
          <button
            onClick={stop}
            className="text-gray-400 hover:text-white transition-colors ml-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full flex items-center gap-2">
          <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="flex-1 h-1 bg-gray-700 rounded-full cursor-pointer group"
          >
            <div
              className="h-full bg-blue-500 rounded-full relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <span className="text-xs text-gray-400 w-10">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Volume control */}
      <div className="w-48 flex items-center justify-end gap-2 flex-shrink-0">
        <span className="text-xs text-gray-400">
          {queueIndex >= 0 && `${queueIndex + 1} / ${queue.length}`}
        </span>
        <div className="relative">
          <button
            onClick={() => setShowVolume(!showVolume)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {volume === 0 ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : volume < 0.5 ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </button>
          {showVolume && (
            <div className="absolute bottom-full right-0 mb-2 bg-gray-800 rounded-lg p-3 shadow-lg">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-24 h-2 appearance-none bg-gray-600 rounded-full cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 ${volume * 100}%, #4b5563 ${volume * 100}%)`
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Play button component for individual tracks
interface PlayButtonProps {
  track: AudioTrack;
  size?: 'small' | 'medium' | 'large';
  onPlay?: () => void;
  className?: string;
}

export function PlayButton({ track, size = 'medium', onPlay, className = '' }: PlayButtonProps) {
  const { currentTrack, isPlaying, play, pause, resume } = useAudioPlayer();
  
  const isCurrentTrack = currentTrack?.ratingKey === track.ratingKey;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrentTrack) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      play(track);
      onPlay?.();
    }
  };

  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-10 h-10',
  };

  const iconSize = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5',
  };

  return (
    <button
      onClick={handleClick}
      className={`${sizeClasses[size]} bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center transition-all hover:scale-110 ${className}`}
    >
      {isCurrentTrack && isPlaying ? (
        <svg className={`${iconSize[size]} text-white`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      ) : (
        <svg className={`${iconSize[size]} text-white ml-0.5`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}
