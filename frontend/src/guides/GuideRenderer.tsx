import React from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Guide } from './types';

const icons = LucideIcons as unknown as Record<string, LucideIcon>;

interface GuideRendererProps {
  guide: Guide;
}

export function GuideRenderer({ guide }: GuideRendererProps) {
  const IconComponent = icons[guide.icon] || LucideIcons.BookOpen;

  function resolveIcon(name: string): LucideIcon {
    return icons[name] || LucideIcons.HelpCircle;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
          <IconComponent className="w-5 h-5 text-primary-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">{guide.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">How to use this page</p>
        </div>
      </div>
      {guide.sections.map((s, i) => {
        const SecIcon = resolveIcon(s.icon);
        return (
          <div key={i} className="flex gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <SecIcon className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">{s.heading}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{s.content}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
