import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

export const DateRangeSelector = ({ onSelectRange, className = '' }) => {
  const [selectedRange, setSelectedRange] = useState('Last 30 Days');
  const [isOpen, setIsOpen] = useState(false);

  const ranges = [
    'Today',
    'Yesterday',
    'Last 7 Days',
    'Last 30 Days',
    'This Month',
    'Last Month',
    'Custom Range',
  ];

  const handleSelect = (range) => {
    setSelectedRange(range);
    setIsOpen(false);
    if (onSelectRange) onSelectRange(range);
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-soft-sm focus-ring"
        aria-expanded={isOpen}
      >
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <span>{selectedRange}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft-lg z-30 py-1 overflow-hidden">
            {ranges.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => handleSelect(range)}
                className={`
                  w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between
                  ${
                    selectedRange === range
                      ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }
                `}
              >
                <span>{range}</span>
                {selectedRange === range && (
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DateRangeSelector;
