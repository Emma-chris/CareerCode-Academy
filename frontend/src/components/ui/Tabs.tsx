import React from 'react';
import { cn } from '@/lib/utils';

export interface Tab {
  key: string;
  label: string;
  icon?: React.ElementType;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

export function Tabs({ tabs, activeKey, onChange, variant = 'underline', className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto scrollbar-hide', variant === 'underline' ? 'border-b border-gray-200 dark:border-gray-800' : '', className)}>
      {tabs.map((tab) => {
        const active = activeKey === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium transition-all whitespace-nowrap',
              variant === 'underline'
                ? 'px-4 py-2.5 border-b-2 -mb-px ' + (active ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')
                : 'px-4 py-2 rounded-lg ' + (active ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800')
            )}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  activeKey: string;
  tabKey: string;
  children: React.ReactNode;
}

export function TabPanel({ activeKey, tabKey, children }: TabPanelProps) {
  if (activeKey !== tabKey) return null;
  return <div>{children}</div>;
}
