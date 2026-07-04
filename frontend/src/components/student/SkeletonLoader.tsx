import { cn } from '@/lib/utils';

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden bg-gray-200 dark:bg-gray-700', className)}>
      <div className="absolute inset-0 shimmer" />
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-white/20 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 p-5 animate-fade-in', className)}>
      <div className="flex items-center gap-3 mb-4">
        <ShimmerBlock className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <ShimmerBlock className="h-4 w-24 rounded" />
          <ShimmerBlock className="h-3 w-16 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <ShimmerBlock className="h-3 w-full rounded" />
        <ShimmerBlock className="h-3 w-3/4 rounded" />
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={cn('rounded-2xl border border-white/20 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 p-4 animate-fade-in')} style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="flex items-center gap-3">
            <ShimmerBlock className="w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <ShimmerBlock className="h-5 w-12 rounded" />
              <ShimmerBlock className="h-3 w-20 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 animate-fade-in bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700">
      <div className="absolute inset-0 shimmer" />
      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-3 flex-1">
          <ShimmerBlock className="h-8 w-64 rounded-lg" />
          <ShimmerBlock className="h-4 w-48 rounded" />
          <div className="flex gap-2 mt-4">
            <ShimmerBlock className="h-10 w-36 rounded-xl" />
            <ShimmerBlock className="h-10 w-36 rounded-xl" />
          </div>
        </div>
        <div className="flex gap-4">
          <ShimmerBlock className="w-20 h-20 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-white/20 dark:border-gray-800/50 bg-white/70 dark:bg-gray-900/70 p-5 animate-fade-in', className)}>
      <ShimmerBlock className="h-5 w-32 rounded mb-4" />
      <ShimmerBlock className="h-48 rounded-xl" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <ShimmerBlock className="h-8 w-48 rounded-lg" />
      <ShimmerBlock className="h-4 w-72 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
