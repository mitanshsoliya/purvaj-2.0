import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export const ErrorState = ({
  title = 'Unable to load data',
  message = 'Something went wrong while connecting to Purvaj 2.0 services.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center p-8
        rounded-xl border border-rose-200 dark:border-rose-900/60
        bg-rose-50/40 dark:bg-rose-950/20 ${className}
      `}
      role="alert"
    >
      <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-rose-900 dark:text-rose-200">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-rose-700/80 dark:text-rose-300/80 mt-1 max-w-sm">
        {message}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button
            size="sm"
            variant="outline"
            icon={RefreshCw}
            onClick={onRetry}
            className="border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40"
          >
            Retry Connection
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;
