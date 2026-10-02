import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({
  message = 'Loading Purvaj 2.0 data...',
  description = 'Please wait while we fetch the latest records.',
  height = 'h-64',
  className = '',
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center p-8
        rounded-xl border border-slate-200/80 dark:border-slate-800
        bg-white dark:bg-slate-900/60 ${height} ${className}
      `}
      role="status"
      aria-live="polite"
    >
      <div className="relative mb-3">
        <div className="w-10 h-10 rounded-full border-2 border-brand-500/20 border-t-brand-600 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {message}
      </p>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {description}
        </p>
      )}
    </div>
  );
};

export default LoadingState;
