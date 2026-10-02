import React from 'react';
import { Search, X } from 'lucide-react';

export const SearchBar = ({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search by name, SKU, shop, or order ID...',
  className = '',
  autoFocus = false,
  showShortcut = false,
}) => {
  return (
    <div className={`relative flex items-center w-full max-w-md ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="search"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 pl-10 pr-9 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus-ring shadow-soft-sm transition-colors"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            if (onClear) onClear();
            else if (onChange) onChange('');
          }}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      ) : showShortcut ? (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">
            ⌘K
          </kbd>
        </div>
      ) : null}
    </div>
  );
};

export default SearchBar;
