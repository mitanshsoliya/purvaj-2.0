import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const KPICard = ({
  title,
  value = '—',
  subtitle,
  icon: Icon,
  trend,
  trendDirection = 'neutral', // 'up' | 'down' | 'neutral'
  badge,
  isLoading = false,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-slate-900 
        border border-slate-200/90 dark:border-slate-800 
        rounded-xl p-5 shadow-soft transition-all duration-200
        ${onClick ? 'cursor-pointer hover:border-brand-500/50 hover:shadow-soft-md' : ''}
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse my-1" />
          ) : (
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {value}
            </h4>
          )}
        </div>
        {Icon && (
          <div className="p-2.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex-shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend || badge) && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            {trend && (
              <span
                className={`inline-flex items-center font-medium ${
                  trendDirection === 'up'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : trendDirection === 'down'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500'
                }`}
              >
                {trendDirection === 'up' && <TrendingUp className="w-3.5 h-3.5 mr-0.5" />}
                {trendDirection === 'down' && <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                {trendDirection === 'neutral' && <Minus className="w-3.5 h-3.5 mr-0.5" />}
                {trend}
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
          {badge && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default KPICard;
