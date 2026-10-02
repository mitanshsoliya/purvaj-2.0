import { useState, useEffect } from 'react';

/**
 * Custom hook to debounce a value by specified delay in milliseconds
 * @param {any} value - The input value to debounce
 * @param {number} delay - Debounce duration in ms (default 300ms)
 * @returns {any} debouncedValue
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
