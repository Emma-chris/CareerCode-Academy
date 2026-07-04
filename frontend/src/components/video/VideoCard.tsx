import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/GlassCard';
import { VideoPlayer } from './VideoPlayer';
import { Badge } from '@/components/ui/Badge';

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url?: string;
    provider?: 'html5' | 'youtube' | 'vimeo';
    duration?: number;
    views?: number;
  };
  className?: string;
}

export function VideoCard({ video, className }: VideoCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}h ${m % 60}m`;
    }
    return s > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${m} min`;
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={cn('cursor-pointer', className)}
        onClick={() => setIsOpen(true)}
      >
        <GlassCard className="overflow-hidden group">
          <div className="relative aspect-video bg-gray-800 overflow-hidden">
            {video.thumbnail_url ? (
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/20 to-accent-500/20">
                <Play className="w-12 h-12 text-primary-500/50" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-primary-500/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                <Play className="w-7 h-7 text-white ml-1" />
              </div>
            </div>
            {video.duration && video.duration > 0 && (
              <Badge variant="default" size="sm" className="absolute bottom-2 right-2">
                {formatDuration(video.duration)}
              </Badge>
            )}
            {video.views !== undefined && video.views > 0 && (
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                <Eye className="w-3 h-3" />
                {video.views}
              </div>
            )}
          </div>
          <div className="p-3">
            <h3 className="text-white font-medium text-sm truncate">{video.title}</h3>
            {video.description && (
              <p className="text-gray-400 text-xs mt-1 line-clamp-1">{video.description}</p>
            )}
          </div>
        </GlassCard>
      </motion.div>

      <VideoPlayer
        videoUrl={video.video_url}
        provider={video.provider}
        thumbnailUrl={video.thumbnail_url}
        title={video.title}
        videoId={video.id}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
