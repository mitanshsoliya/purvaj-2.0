import React from 'react';

export const Card = ({
  children,
  title,
  subtitle,
  action,
  footer,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  noPadding = false,
  interactive = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white dark:bg-slate-900 
        border border-slate-200/80 dark:border-slate-800 
        rounded-xl shadow-soft transition-all duration-200
        overflow-hidden
        ${interactive || onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-soft-md' : ''}
        ${className}
      `}
    >
      {(title || subtitle || action) && (
        <div
          className={`
            px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 
            flex items-center justify-between gap-4
            ${headerClassName}
          `}
        >
          <div>
            {title && (
              <h3 className="font-semibold text-slate-900 dark:text-white text-base tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}

      <div className={noPadding ? '' : `p-5 ${bodyClassName}`}>
        {children}
      </div>

      {footer && (
        <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/80">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
