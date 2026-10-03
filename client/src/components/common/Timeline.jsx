import React from 'react';
import { Check, Clock, AlertCircle } from 'lucide-react';

/**
 * Enterprise Timeline Component
 * Perfect for Order tracking, audit trails, and delivery milestones
 */
export const Timeline = ({ items = [], className = '' }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className={`relative pl-2 py-2 space-y-6 ${className}`}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const isCompleted = item.status === 'completed' || item.isCompleted;
        const isCurrent = item.status === 'current' || item.isCurrent;
        const isFailed = item.status === 'failed' || item.isFailed;

        return (
          <div key={item.id || idx} className="relative flex items-start gap-3.5 group">
            {/* Connecting line */}
            {!isLast && (
              <div
                className={`absolute left-[15px] top-7 bottom-[-24px] w-0.5 ${
                  isCompleted ? 'bg-brand-500 dark:bg-brand-600' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            )}

            {/* Icon Node */}
            <div className="relative z-10 flex-shrink-0">
              {isCompleted ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-soft-xs ring-4 ring-white dark:ring-slate-900">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              ) : isCurrent ? (
                <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-glow-brand ring-4 ring-brand-100 dark:ring-brand-950 animate-pulse">
                  <Clock className="w-4 h-4" />
                </div>
              ) : isFailed ? (
                <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-soft-xs ring-4 ring-white dark:ring-slate-900">
                  <AlertCircle className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 text-slate-400 flex items-center justify-center ring-4 ring-white dark:ring-slate-900">
                  <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                </div>
              )}
            </div>

            {/* Step details */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={`text-sm font-semibold truncate ${
                    isCurrent
                      ? 'text-brand-600 dark:text-brand-400'
                      : isCompleted
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {item.title}
                </p>
                {item.timestamp && (
                  <span className="text-[11px] text-slate-400 whitespace-nowrap flex-shrink-0 font-medium">
                    {item.timestamp}
                  </span>
                )}
              </div>

              {item.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {item.description}
                </p>
              )}

              {item.meta && (
                <div className="mt-2 text-xs bg-slate-50 dark:bg-slate-850 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800">
                  {item.meta}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Timeline;
