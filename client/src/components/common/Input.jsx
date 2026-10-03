import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  id,
  name,
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  error,
  helperText,
  icon: Icon,
  rightElement,
  disabled = false,
  required = false,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  const inputId = id || name || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-soft-sm">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          className={`
            w-full rounded-lg text-sm bg-white dark:bg-slate-900 
            text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500
            border transition-colors duration-150 focus-ring font-medium
            ${Icon ? 'pl-9' : 'pl-3.5'}
            ${rightElement ? 'pr-10' : 'pr-3.5'}
            py-2.5
            ${error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
              : 'border-slate-300 dark:border-slate-700 focus:border-brand-500'
            }
            ${disabled ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed' : ''}
            ${className}
          `}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-semibold">
          {error}
        </p>
      ) : helperText ? (
        <p id={`${inputId}-helper`} className="mt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
