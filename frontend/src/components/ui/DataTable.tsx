import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronRight } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Badge } from './Badge';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { SkeletonLine } from './Skeleton';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  hidden?: boolean;
  hideable?: boolean;
  className?: string;
  render: (item: T, index: number) => React.ReactNode;
  mobileRender?: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onRowClick?: (item: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  className?: string;
  mobileCard?: (item: T) => React.ReactNode;
}

function SortIcon({ field, sortField, sortDir }: { field: string; sortField?: string; sortDir?: 'asc' | 'desc' }) {
  if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-30" />;
  return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading,
  error,
  onRetry,
  sortField,
  sortDir,
  onSort,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  emptyTitle = 'No data found',
  emptyDescription,
  emptyAction,
  className,
  mobileCard,
}: DataTableProps<T>) {
  const visibleColumns = columns.filter(c => !c.hidden);

  if (error) {
    return (
      <GlassCard hover={false} className={cn('p-8', className)}>
        <EmptyState
          icon={<div className="w-8 h-8 text-red-400" />}
          title="Failed to load data"
          description={error}
          action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
        />
      </GlassCard>
    );
  }

  if (isLoading) {
    return (
      <GlassCard hover={false} className={cn('p-4', className)}>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <SkeletonLine className="w-8 h-8" />
              {visibleColumns.slice(0, 3).map((col) => (
                <SkeletonLine key={col.key} className="flex-1 h-4" />
              ))}
            </div>
          ))}
        </div>
      </GlassCard>
    );
  }

  if (data.length === 0) {
    return (
      <GlassCard hover={false} className={cn(className)}>
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </GlassCard>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <GlassCard hover={false} className={cn('overflow-hidden hidden sm:block', className)}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {selected && onToggleSelectAll && (
                  <th className="p-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === data.length && data.length > 0}
                      onChange={onToggleSelectAll}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                  </th>
                )}
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      'p-3 text-left',
                      col.sortable && 'cursor-pointer select-none',
                      col.className
                    )}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {col.label}
                      {col.sortable && onSort && (
                        <SortIcon field={col.key} sortField={sortField} sortDir={sortDir} />
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-3 text-right w-20" />
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => {
                const key = keyExtractor(item);
                return (
                  <motion.tr
                    key={key}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      'border-b border-gray-50 dark:border-gray-800/50 transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/30'
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {selected && onToggleSelect && (
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          onChange={() => onToggleSelect(key)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>
                    )}
                    {visibleColumns.map((col) => (
                      <td key={col.key} className={cn('p-3', col.className)} onClick={e => e.stopPropagation()}>
                        {col.render(item, index)}
                      </td>
                    ))}
                    <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                      {onRowClick && <ChevronRight className="w-3.5 h-3.5 text-gray-400 ml-auto" />}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {data.map((item, index) => {
          const key = keyExtractor(item);
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              {mobileCard ? (
                mobileCard(item)
              ) : (
                <GlassCard hover={false} className="p-4" onClick={() => onRowClick?.(item)}>
                  <div className="flex items-start gap-3">
                    {selected && onToggleSelect && (
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => onToggleSelect(key)}
                        className="mt-1 rounded border-gray-300 dark:border-gray-600"
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                    <div className="flex-1 min-w-0 space-y-2">
                      {visibleColumns.map((col) => (
                        <div key={col.key}>
                          {col.mobileRender ? col.mobileRender(item, index) : col.render(item, index)}
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              )}
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
