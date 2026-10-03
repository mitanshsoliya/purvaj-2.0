import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const colorPresets = {
  emerald: {
    iconBg: 'bg-emerald-100 dark:bg-emerald-950/50',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-l-emerald-500',
    trendText: 'text-emerald-600 dark:text-emerald-400',
  },
  brand: {
    iconBg: 'bg-brand-100 dark:bg-brand-950/50',
    iconText: 'text-brand-600 dark:text-brand-400',
    border: 'border-l-brand-500',
    trendText: 'text-brand-600 dark:text-brand-400',
  },
  sky: {
    iconBg: 'bg-sky-100 dark:bg-sky-950/50',
    iconText: 'text-sky-600 dark:text-sky-400',
    border: 'border-l-sky-500',
    trendText: 'text-sky-600 dark:text-sky-400',
  },
  amber: {
    iconBg: 'bg-amber-100 dark:bg-amber-950/50',
    iconText: 'text-amber-600 dark:text-amber-400',
    border: 'border-l-amber-500',
    trendText: 'text-amber-600 dark:text-amber-400',
  },
  purple: {
    iconBg: 'bg-purple-100 dark:bg-purple-950/50',
    iconText: 'text-purple-600 dark:text-purple-400',
    border: 'border-l-purple-500',
    trendText: 'text-purple-600 dark:text-purple-400',
  },
  rose: {
    iconBg: 'bg-rose-100 dark:bg-rose-950/50',
    iconText: 'text-rose-600 dark:text-rose-400',
    border: 'border-l-rose-500',
    trendText: 'text-rose-600 dark:text-rose-400',
  },
};

export const KPICard = ({
  title,
  value = '—',
  subtitle,
  icon: Icon,
  trend,
  trendDirection = 'neutral', // 'up' | 'down' | 'neutral'
  badge,
  color = 'brand', // emerald | brand | sky | amber | purple | rose
  isLoading = false,
  className = '',
  onClick,
}) => {
  const palette = colorPresets[color] || colorPresets.brand;

  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-slate-900 
        border border-slate-200/90 dark:border-slate-800 
        border-l-4 ${palette.border}
        rounded-xl p-4 sm:p-5 shadow-soft transition-all duration-200
        hover:shadow-soft-md
        ${onClick ? 'cursor-pointer hover:border-brand-500/50' : ''}
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 truncate">
            {title}
          </p>
          {isLoading ? (
            <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse my-1" />
          ) : (
            <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {value}
            </h4>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${palette.iconBg} ${palette.iconText} flex-shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend || badge) && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
            {trend && (
              <span
                className={`inline-flex items-center font-bold ${
                  trendDirection === 'up'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : trendDirection === 'down'
                    ? 'text-rose-600 dark:text-rose-400'
                    : palette.trendText
                }`}
              >
                {trendDirection === 'up' && <TrendingUp className="w-3.5 h-3.5 mr-0.5" />}
                {trendDirection === 'down' && <TrendingDown className="w-3.5 h-3.5 mr-0.5" />}
                {trendDirection === 'neutral' && <Minus className="w-3.5 h-3.5 mr-0.5" />}
                {trend}
              </span>
            )}
            {subtitle && <span className="text-slate-600 dark:text-slate-300">{subtitle}</span>}
          </div>
          {badge && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default KPICard;
