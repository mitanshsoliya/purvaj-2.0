import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const iconColorMap = {
  brand: 'bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
  purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400',
};

export const KPICard = ({
  title,
  value = '—',
  subtitle,
  icon: Icon,
  iconColor = 'brand',
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
        border border-slate-200/80 dark:border-slate-800 
        rounded-xl p-5 shadow-soft transition-all duration-200
        ${onClick ? 'cursor-pointer hover:border-brand-500/50 hover:shadow-soft-md active:scale-[0.99]' : ''}
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {title}
          </p>
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse my-1" />
          ) : (
            <h4 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
              {value}
            </h4>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl flex-shrink-0 shadow-soft-2xs ${iconColorMap[iconColor] || iconColorMap.brand}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend || badge) && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 truncate">
            {trend && (
              <span
                className={`inline-flex items-center font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                  trendDirection === 'up'
                    ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400'
                    : trendDirection === 'down'
                    ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400'
                    : 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {trendDirection === 'up' && <TrendingUp className="w-3 h-3 mr-1" />}
                {trendDirection === 'down' && <TrendingDown className="w-3 h-3 mr-1" />}
                {trendDirection === 'neutral' && <Minus className="w-3 h-3 mr-1" />}
                {trend}
              </span>
            )}
            {subtitle && <span className="truncate">{subtitle}</span>}
          </div>
          {badge && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium flex-shrink-0">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default KPICard;
