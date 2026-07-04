import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/axios';

type VideoProvider = 'html5' | 'youtube' | 'vimeo';

interface VideoPlayerProps {
  videoUrl: string;
  provider?: VideoProvider;
  thumbnailUrl?: string;
  title?: string;
  videoId?: string;
  isOpen: boolean;
  onClose: () => void;
}

function getYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] || null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match?.[1] || null;
}

function detectProvider(url: string): VideoProvider {
  if (getYoutubeId(url)) return 'youtube';
  if (getVimeoId(url)) return 'vimeo';
  return 'html5';
}

function getEmbedUrl(url: string, provider: VideoProvider): string {
  if (provider === 'youtube') {
    const id = getYoutubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : url;
  }
  if (provider === 'vimeo') {
    const id = getVimeoId(url);
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : url;
  }
  return url;
}

export function VideoPlayer({ videoUrl, provider, thumbnailUrl, title, videoId, isOpen, onClose }: VideoPlayerProps) {
  const resolvedProvider = provider || detectProvider(videoUrl);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastHeartbeatRef = useRef(0);

  const sendHeartbeat = useCallback(async (completed: boolean) => {
    if (!videoId) return;
    const elapsed = Math.floor(Date.now() / 1000) - lastHeartbeatRef.current;
    if (elapsed < 5 && !completed) return;
    try {
      await api.post(`/showcase-videos/${videoId}/analytics`, {
        watch_duration: Math.floor(currentTime),
        completed,
      });
      lastHeartbeatRef.current = Math.floor(Date.now() / 1000);
    } catch {}
  }, [videoId, currentTime]);

  useEffect(() => {
    if (!isOpen || !videoId || resolvedProvider !== 'html5') return;
    heartbeatRef.current = setInterval(() => sendHeartbeat(false), 15000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isOpen, videoId, sendHeartbeat, resolvedProvider]);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    }
  }, [isOpen]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    setDuration(videoRef.current.duration || 0);
    if (videoRef.current.duration) {
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    sendHeartbeat(true);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = async () => {
    const el = videoRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              {title && (
                <span className="text-white text-sm font-medium bg-black/60 px-3 py-1.5 rounded-full truncate max-w-[200px] sm:max-w-xs">
                  {title}
                </span>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {resolvedProvider === 'html5' ? (
              <div className="relative group">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  poster={thumbnailUrl || undefined}
                  className="w-full aspect-video bg-black cursor-pointer"
                  onClick={togglePlay}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleEnded}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  playsInline
                />

                <div className={cn(
                  'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12 transition-opacity',
                  isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
                )}>
                  <div
                    className="w-full h-1 bg-gray-600 rounded-full mb-3 cursor-pointer group/progress"
                    onClick={handleProgressClick}
                  >
                    <div
                      className="h-full bg-primary-500 rounded-full relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary-500 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={togglePlay} className="text-white hover:text-primary-500 transition-colors">
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <button onClick={toggleMute} className="text-white hover:text-primary-500 transition-colors">
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <span className="text-white/80 text-sm tabular-nums">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>
                    <button onClick={toggleFullscreen} className="text-white hover:text-primary-500 transition-colors">
                      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-primary-500/90 flex items-center justify-center pointer-events-auto cursor-pointer hover:bg-primary-500 transition-colors" onClick={togglePlay}>
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative aspect-video bg-black">
                <iframe
                  src={getEmbedUrl(videoUrl, resolvedProvider)}
                  className="absolute inset-0 w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title={title || 'Video'}
                />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
