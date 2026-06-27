import { useRef, useCallback } from 'react';
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
  title?: string;
  description?: string;
  playbackSpeed?: number;
  onProgress?: (lessonId: string) => void;
  onSpeedChange?: (speed: number) => void;
}

export default function VideoPlayer({
  videoUrl, lessonId, title, description,
  playbackSpeed = 1, onProgress, onSpeedChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  }, []);

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
    const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;

    return (
      <div
        ref={containerRef}
        className="bg-black flex items-center justify-center relative"
        style={{ maxHeight: '55vh' }}
      >
        <iframe
          src={embedUrl}
          className="w-full h-full"
          style={{ aspectRatio: '16/9', maxHeight: '55vh' }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title || 'Lesson video'}
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
        onTimeUpdate={() => lessonId && onProgress?.(lessonId)}
        onPause={() => lessonId && onProgress?.(lessonId)}
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