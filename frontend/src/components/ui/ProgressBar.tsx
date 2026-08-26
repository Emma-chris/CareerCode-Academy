import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
};

export function ProgressBar({ value, size = 'md', color, showLabel, animated = true, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden', sizeClasses[size])}>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            animated && 'transition-all duration-500 ease-out',
            color || 'bg-gradient-to-r from-primary-500 to-primary-400'
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
