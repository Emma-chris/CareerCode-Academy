import { useRef, useCallback, useEffect, useState } from 'react';
import { Maximize, PlayCircle } from 'lucide-react';

function getYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function isYoutubeUrl(url: string): boolean {
  return !!getYoutubeId(url);
}

interface VideoPlayerProps {
  videoUrl: string | null;
  lessonId: string | null;
  courseId?: string;
  title?: string;
  description?: string;
  playbackSpeed?: number;
  initialPosition?: number;
  onProgress?: (lessonId: string) => void;
  onPositionUpdate?: (lessonId: string, courseId: string, position: number, percentage: number) => void;
  onSpeedChange?: (speed: number) => void;
}

export default function VideoPlayer({
  videoUrl, lessonId, courseId, title, description,
  playbackSpeed = 1, initialPosition = 0,
  onProgress, onPositionUpdate, onSpeedChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [ytReady, setYtReady] = useState(false);
  const trackingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up YouTube player on unmount
  useEffect(() => {
    return () => {
      if (trackingRef.current) clearInterval(trackingRef.current);
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, []);

  const startTracking = useCallback(() => {
    if (trackingRef.current) clearInterval(trackingRef.current);
    if (!lessonId || !courseId || !onPositionUpdate) return;

    trackingRef.current = setInterval(() => {
      let position = 0;
      let duration = 1;
      if (playerRef.current?.getCurrentTime) {
        position = playerRef.current.getCurrentTime();
        duration = playerRef.current.getDuration() || 1;
      } else if (videoRef.current) {
        position = videoRef.current.currentTime;
        duration = videoRef.current.duration || 1;
      }
      const percentage = Math.round((position / duration) * 100);
      if (percentage > 0) {
        onPositionUpdate(lessonId, courseId, Math.round(position), percentage);
      }
    }, 5000);
  }, [lessonId, courseId, onPositionUpdate]);

  const handleToggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }, []);

  // YouTube IFrame API player setup
  useEffect(() => {
    if (!videoUrl) return;
    const youtubeId = isYoutubeUrl(videoUrl) ? getYoutubeId(videoUrl) : null;
    if (!youtubeId) return;

    let player: any = null;
    let checkReady: ReturnType<typeof setInterval>;

    const initPlayer = () => {
      if (!(window as any).YT?.Player) {
        checkReady = setInterval(() => {
          if ((window as any).YT?.Player) {
            clearInterval(checkReady);
            buildPlayer();
          }
        }, 200);
        return;
      }
      buildPlayer();
    };

    const buildPlayer = () => {
      const container = document.getElementById('youtube-player');
      if (!container) return;
      container.innerHTML = '';

      player = new (window as any).YT.Player('youtube-player', {
        videoId: youtubeId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
        },
        height: '100%',
        width: '100%',
        events: {
          onReady: () => {
            if (initialPosition > 0) {
              player.seekTo(initialPosition, true);
            }
            setYtReady(true);
            startTracking();
          },
          onStateChange: (e: any) => {
            if (e.data === 1) {
              startTracking();
            }
          },
        },
      });
      playerRef.current = player;
    };

    // Load YouTube IFrame API if not already loaded
    if (!(window as any).YT?.Player) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript?.parentNode?.insertBefore(tag, firstScript);
    }

    initPlayer();

    return () => {
      if (checkReady) clearInterval(checkReady);
      if (trackingRef.current) clearInterval(trackingRef.current);
      if (player?.destroy) {
        try { player.destroy(); } catch {}
      }
      playerRef.current = null;
    };
  }, [videoUrl, initialPosition, startTracking]);

  const handleVideoTimeUpdate = useCallback(() => {
    if (lessonId) {
      onProgress?.(lessonId);
      if (videoRef.current && courseId && onPositionUpdate) {
        const pos = Math.round(videoRef.current.currentTime);
        const dur = videoRef.current.duration || 1;
        const pct = Math.round((pos / dur) * 100);
        if (pct > 0) {
          onPositionUpdate(lessonId, courseId, pos, pct);
        }
      }
    }
  }, [lessonId, courseId, onProgress, onPositionUpdate]);

  // Seek native video to initial position when it loads
  const handleVideoLoaded = useCallback(() => {
    if (videoRef.current && initialPosition > 0) {
      videoRef.current.currentTime = initialPosition;
    }
  }, [initialPosition]);

  if (!videoUrl) {
    return (
      <div className="bg-black flex items-center justify-center h-full min-h-[300px]">
        <div className="text-center p-12">
          <PlayCircle className="w-20 h-20 text-blue-400/50 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">{title || 'Select a lesson to begin'}</p>
          {description && (
            <p className="text-gray-600 text-sm mt-2 max-w-lg mx-auto">{description}</p>
          )}
        </div>
      </div>
    );
  }

  const youtubeId = isYoutubeUrl(videoUrl) ? getYoutubeId(videoUrl) : null;

  if (youtubeId) {
    return (
      <div
        ref={containerRef}
        className="bg-black flex items-center justify-center relative"
        style={{ maxHeight: '55vh' }}
      >
        <div
          id="youtube-player"
          className="w-full h-full"
          style={{ aspectRatio: '16/9', maxHeight: '55vh' }}
        />
        <button
          onClick={handleToggleFullscreen}
          className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 transition-colors z-10"
          title="Toggle fullscreen"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-black flex items-center justify-center relative"
      style={{ maxHeight: '55vh' }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        src={videoUrl}
        controls
        onTimeUpdate={handleVideoTimeUpdate}
        onPause={() => lessonId && onProgress?.(lessonId)}
        onLoadedMetadata={handleVideoLoaded}
        onLoadedData={handleVideoLoaded}
      />
      {onSpeedChange && (
        <div className="absolute bottom-2 right-14 z-10 flex gap-1">
          {[0.5, 1, 1.25, 1.5, 2].map(speed => (
            <button
              key={speed}
              onClick={() => {
                onSpeedChange(speed);
                if (videoRef.current) videoRef.current.playbackRate = speed;
              }}
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                playbackSpeed === speed
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700/80'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      )}
      <button
        onClick={handleToggleFullscreen}
        className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-gray-800/80 text-gray-300 hover:bg-gray-700/80 transition-colors z-10"
        title="Toggle fullscreen"
      >
        <Maximize className="w-4 h-4" />
      </button>
    </div>
  );
}
