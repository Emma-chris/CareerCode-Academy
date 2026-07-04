import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function Breadcrumb({ items, showHome = true, className }: BreadcrumbProps) {
  return (
    <nav className={cn('flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400', className)}>
      {showHome && (
        <>
          <Link to="/" className="hover:text-primary-500 transition-colors flex items-center">
            <Home className="w-4 h-4" />
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
        </>
      )}
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={item.label}>
            {item.href && !isLast ? (
              <Link to={item.href} className="hover:text-primary-500 transition-colors truncate max-w-[200px]">
                {item.label}
              </Link>
            ) : (
              <span className={cn('truncate max-w-[200px]', isLast && 'text-gray-900 dark:text-gray-100 font-medium')}>
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
