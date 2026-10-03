import React, { useState } from 'react';
import { Filter, X, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import Button from './Button';

/**
 * FilterPanel Component
 * Provides clean filter controls with active filters count and reset
 */
export const FilterPanel = ({
  children,
  activeFiltersCount = 0,
  onReset,
  className = '',
  collapsible = false,
  defaultExpanded = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`
        bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 
        rounded-xl shadow-soft-2xs transition-all overflow-hidden ${className}
      `}
    >
      {/* Header bar if collapsible or if active filters exist */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <Filter className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Filters & Criteria
          </span>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {activeFiltersCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && onReset && (
            <Button
              variant="ghost"
              size="xs"
              onClick={onReset}
              icon={RotateCcw}
              className="text-slate-500 hover:text-rose-600"
            >
              Reset All
            </Button>
          )}

          {collapsible && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
              aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Filter Body */}
      {(!collapsible || isExpanded) && (
        <div className="p-4 bg-slate-50/40 dark:bg-slate-900/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 items-end">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPanel;
