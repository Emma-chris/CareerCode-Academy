import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({ variant = 'text', width, height, className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-gray-200 dark:bg-gray-700 animate-fade-in',
        variant === 'circular' && 'rounded-full',
        variant === 'rounded' && 'rounded-xl',
        variant === 'rectangular' && 'rounded-none',
        variant === 'text' && 'rounded h-4 w-full',
        className
      )}
      style={{ width, height }}
    >
      <div className="absolute inset-0 shimmer" />
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <Skeleton variant="rounded" className={cn('h-24', className)} />;
}

export function SkeletonLine({ width, className }: { width?: string; className?: string }) {
  return <Skeleton variant="text" className={cn(width || 'w-full', className)} />;
}

export function SkeletonCircle({ size = 10 }: { size?: number }) {
  return <Skeleton variant="circular" width={size} height={size} />;
}
