import React from 'react';

export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded ${className}`}
      {...props}
    />
  );
};

export const SkeletonCard = ({ className = '' }) => {
  return (
    <div className={`p-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 space-y-3 ${className}`}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <div className="pt-2 flex justify-between">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
};

export const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => {
  return (
    <div className={`w-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 ${className}`}>
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex space-x-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 flex space-x-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const PageSkeleton = () => {
  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full animate-fadeIn">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Content skeleton */}
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
};

export default Skeleton;
