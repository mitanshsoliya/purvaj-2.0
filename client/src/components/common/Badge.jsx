import React from 'react';

const variantStyles = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  brand: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-950/40 dark:text-brand-300 dark:border-brand-800/60',
  info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
  warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

const dotColors = {
  success: 'bg-emerald-500',
  brand: 'bg-brand-500',
  info: 'bg-sky-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  neutral: 'bg-slate-400',
};

export const Badge = ({
  children,
  variant = 'neutral',
  size = 'sm',
  showDot = true,
  className = '',
}) => {
  const sizeClasses = size === 'xs'
    ? 'text-[10px] px-2 py-0.5'
    : size === 'md'
    ? 'text-xs px-3 py-1 font-semibold'
    : 'text-xs px-2.5 py-0.5 font-medium';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border
        ${sizeClasses}
        ${variantStyles[variant] || variantStyles.neutral}
        ${className}
      `}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || dotColors.neutral}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
};

export default Badge;
