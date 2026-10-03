import React from 'react';

const variantStyles = {
  success: 'bg-emerald-100 text-emerald-900 font-bold border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  brand: 'bg-brand-100 text-brand-900 font-bold border-brand-300 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800',
  info: 'bg-sky-100 text-sky-900 font-bold border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  warning: 'bg-amber-100 text-amber-900 font-bold border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  danger: 'bg-rose-100 text-rose-900 font-bold border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
  neutral: 'bg-slate-100 text-slate-800 font-bold border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
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
