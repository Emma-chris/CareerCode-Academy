import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, BookOpen, Code2, Compass, User, TrendingUp, ArrowRight } from 'lucide-react';
import { useStudentStore } from '@/store/studentStore';
import { cn } from '@/lib/utils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const placeholderSuggestions = [
  'Web Development', 'Data Science', 'React', 'Python', 'JavaScript',
  'Machine Learning', 'Mobile Development', 'DevOps', 'Cloud Computing',
];

const defaultResults = [
  { type: 'category' as const, label: 'Web Development', path: '/courses', icon: Code2 },
  { type: 'category' as const, label: 'Data Science', path: '/courses', icon: TrendingUp },
  { type: 'category' as const, label: 'Mobile Development', path: '/courses', icon: BookOpen },
  { type: 'page' as const, label: 'Browse All Courses', path: '/courses', icon: Compass },
  { type: 'page' as const, label: 'View Schools', path: '/schools', icon: BookOpen },
  { type: 'page' as const, label: 'Instructor Applications', path: '/become-instructor', icon: User },
];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { searchResults, globalSearch } = useStudentStore();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.length >= 2) {
      globalSearch(query);
    }
  }, [query, globalSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const results = query.length >= 2 && searchResults.length > 0
    ? searchResults.map((r: any) => ({ type: 'result' as const, ...r }))
    : query.length === 0
      ? defaultResults
      : [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      navigate(results[selectedIndex].path);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl mx-4 glass-card overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/20 dark:border-gray-800/50">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleKeyDown}
                placeholder="Search courses, schools, topics..."
                className="flex-1 bg-transparent text-base text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none"
              />
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400">
                <kbd className="px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-medium">ESC</kbd>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-0.5">
              {query.length === 0 && (
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Quick Links</p>
                </div>
              )}

              {results.length === 0 && query.length >= 2 ? (
                <div className="flex flex-col items-center py-10 text-gray-400">
                  <Search className="w-8 h-8 mb-3" />
                  <p className="text-sm font-medium">No results found</p>
                  <p className="text-xs">Try a different search term</p>
                </div>
              ) : (
                results.map((result, i) => {
                  const Icon = result.icon || BookOpen;
                  return (
                    <button
                      key={`${result.label}-${i}`}
                      onClick={() => { navigate(result.path); onClose(); }}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                        selectedIndex === i
                          ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        selectedIndex === i ? 'bg-primary-500/20 text-primary-500' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.label}</p>
                      </div>
                      <ArrowRight className={cn('w-4 h-4 flex-shrink-0 opacity-0 -ml-2 transition-all', selectedIndex === i && 'opacity-100 ml-0')} />
                    </button>
                  );
                })
              )}

              {query.length === 0 && (
                <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-400 mb-2">Suggestions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {placeholderSuggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => setQuery(s)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
