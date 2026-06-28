import React from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboarding } from './OnboardingContext';
import { getGuide } from './index';

export function PageGuideButton({ className }: { className?: string }) {
  const location = useLocation();
  const { openPageGuide } = useOnboarding();

  const guide = getGuide(location.pathname);
  if (!guide) return null;

  return (
    <button
      onClick={() => openPageGuide(guide)}
      className={cn(
        'flex items-center justify-center',
        className || 'p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
      )}
      aria-label="Page guide"
      title="How to use this page"
    >
      <HelpCircle className="w-5 h-5" />
    </button>
  );
}
