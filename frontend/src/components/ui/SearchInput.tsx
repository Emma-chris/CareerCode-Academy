import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  onSearch: (value: string) => void;
  className?: string;
}

export function SearchInput({ value: externalValue, onChange, placeholder = 'Search...', debounceMs = 300, onSearch, className }: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(externalValue || '');
  const isControlled = externalValue !== undefined;
  const value = isControlled ? externalValue : internalValue;
  const setValue = isControlled && onChange ? onChange : setInternalValue;

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [value, debounceMs, onSearch]);

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full pl-9 pr-8 py-2 rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-transparent focus:border-primary-500/50 focus:bg-white dark:focus:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-300 outline-none transition-all"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Clear search"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}
