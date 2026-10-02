import React from 'react';
import { Link } from 'react-router-dom';

export const BrandLogo = ({
  collapsed = false,
  variant = 'dark', // 'dark' (sidebar) | 'light' (clean header)
  to = '/',
  showSubtitle = true,
  className = '',
}) => {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-3 transition-opacity hover:opacity-90 ${className}`}
      aria-label="Purvaj 2.0 Home"
    >
      <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-soft-sm text-white flex-shrink-0">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          <path d="M6 3h7a5 5 0 0 1 5 5 5 5 0 0 1-5 5H6V3z" fill="currentColor" fillOpacity="0.15" />
          <path d="M6 3h7a5 5 0 0 1 5 5 5 5 0 0 1-5 5H6V3z" />
          <path d="M6 13v8" />
        </svg>
        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-sky-400 border-2 border-slate-900 rounded-full flex items-center justify-center text-[8px] font-bold text-slate-950">
          2
        </span>
      </div>

      {!collapsed && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-lg font-bold tracking-tight ${
                variant === 'dark' ? 'text-white' : 'text-slate-900 dark:text-white'
              }`}
            >
              PURVAJ
            </span>
            <span className="text-xs font-extrabold px-1.5 py-0.5 rounded bg-brand-500 text-white leading-none">
              2.0
            </span>
          </div>
          {showSubtitle && (
            <span
              className={`text-[10px] tracking-wider uppercase font-semibold mt-1 ${
                variant === 'dark' ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              B2B Wholesale
            </span>
          )}
        </div>
      )}
    </Link>
  );
};

export default BrandLogo;
