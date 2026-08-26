import React from 'react';
import { cn } from '@/lib/utils';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
}

const sizes = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

const borderSizes = {
  sm: 'border-2',
  md: 'border-[3px]',
  lg: 'border-4',
};

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const imgSizes = {
    sm: 'w-8 h-8',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };
  return (
    <div className="relative flex items-center justify-center">
      <div className={cn(imgSizes[size], 'relative animate-pulse')}>
        <img src="/screen.png" alt="Loading" className="w-full h-full object-contain drop-shadow-lg" />
      </div>
    </div>
  );
}

function BouncingDots({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            dotSizes[size],
            `rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 animate-bounce-dot-${i}`
          )}
        />
      ))}
    </div>
  );
}

function PulseRing({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="relative flex items-center justify-center">
      <div className={cn(sizes[size], 'rounded-full bg-gradient-to-br from-primary-400 via-secondary-500 to-accent-500 animate-pulse')} />
      <div className={cn('absolute rounded-full border-2 border-primary-500/30 animate-pulse-ring', sizes[size])} />
      <div className={cn('absolute rounded-full border border-secondary-500/20 animate-pulse-ring', sizes[size])} style={{ animationDelay: '0.5s' }} />
    </div>
  );
}

function LoadingBars({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const barSizes = {
    sm: 'w-0.5 h-3',
    md: 'w-1 h-5',
    lg: 'w-1.5 h-7',
  };
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={cn(
            barSizes[size],
            'rounded-full bg-gradient-to-t from-primary-500 to-secondary-500',
            'animate-[loadingBarAlt_1.2s_ease-in-out_infinite]',
          )}
          style={{ animationDelay: `${i * 0.15}s`, animation: `loadingBarAlt 1.2s ease-in-out ${i * 0.15}s infinite` }}
        />
      ))}
    </div>
  );
}

const variants = {
  spinner: Spinner,
  dots: BouncingDots,
  pulse: PulseRing,
  bars: LoadingBars,
};

export function Loader({ size = 'md', text, className, variant = 'spinner' }: LoaderProps) {
  const SpinnerComponent = variants[variant] || variants.spinner;
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <SpinnerComponent size={size} />
      {text && (
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-fade-in">
          {text}
          <span className="inline-flex ml-0.5">
            <span className="animate-bounce-dot-1">.</span>
            <span className="animate-bounce-dot-2">.</span>
            <span className="animate-bounce-dot-3">.</span>
          </span>
        </p>
      )}
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-secondary-500/5" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="relative flex flex-col items-center gap-6">
        <Loader size="lg" variant="spinner" />
        <div className="text-center">
          <p className="text-lg font-semibold bg-gradient-to-r from-primary-600 via-secondary-500 to-accent-500 bg-clip-text text-transparent">
            Loading
            <span className="inline-flex ml-0.5">
              <span className="animate-bounce-dot-1">.</span>
              <span className="animate-bounce-dot-2">.</span>
              <span className="animate-bounce-dot-3">.</span>
            </span>
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Please wait a moment</p>
        </div>
      </div>
    </div>
  );
}
