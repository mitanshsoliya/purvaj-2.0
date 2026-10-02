import React from 'react';
import { Calendar } from 'lucide-react';

export const DatePicker = ({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  min,
  max,
  disabled = false,
  error,
  className = '',
  containerClassName = '',
}) => {
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="date"
          value={value}
          onChange={onChange}
          min={min}
          max={max}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            w-full rounded-lg text-sm bg-white dark:bg-slate-900 
            text-slate-900 dark:text-slate-100 border transition-colors duration-150 focus-ring
            pl-3.5 pr-10 py-2
            ${error
              ? 'border-rose-400 focus:border-rose-500'
              : 'border-slate-300 dark:border-slate-700 focus:border-brand-500'
            }
            ${disabled ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : ''}
            ${className}
          `}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
          <Calendar className="w-4 h-4" />
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
    </div>
  );
};

export default DatePicker;
