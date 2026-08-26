import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Guide } from './types';

interface OnboardingContextType {
  showOnboarding: boolean;
  pageGuide: Guide | null;
  pageGuideOpen: boolean;
  startOnboarding: () => void;
  dismissOnboarding: () => void;
  openPageGuide: (guide: Guide) => void;
  closePageGuide: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pageGuide, setPageGuide] = useState<Guide | null>(null);
  const [pageGuideOpen, setPageGuideOpen] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed');
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  const startOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  const dismissOnboarding = useCallback(() => {
    localStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
  }, []);

  const openPageGuide = useCallback((guide: Guide) => {
    setPageGuide(guide);
    setPageGuideOpen(true);
  }, []);

  const closePageGuide = useCallback(() => {
    setPageGuideOpen(false);
    setPageGuide(null);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        showOnboarding,
        pageGuide,
        pageGuideOpen,
        startOnboarding,
        dismissOnboarding,
        openPageGuide,
        closePageGuide,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within OnboardingProvider');
  return ctx;
}
