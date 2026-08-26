import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeartsBarProps {
  hearts: number;
  maxHearts: number;
  nextHeartIn: number | null;
}

export function HeartsBar({ hearts, maxHearts, nextHeartIn }: HeartsBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({ length: maxHearts }, (_, i) => (
          <Heart
            key={i}
            className={cn(
              'w-5 h-5 transition-all',
              i < hearts
                ? 'text-danger-500 fill-danger-500'
                : 'text-gray-600 fill-transparent'
            )}
          />
        ))}
      </div>
      {nextHeartIn !== null && nextHeartIn > 0 && (
        <span className="text-[10px] text-gray-400 ml-1">
          +1 in {nextHeartIn}m
        </span>
      )}
    </div>
  );
}
