import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useOnboarding } from './OnboardingContext';
import { GuideRenderer } from './GuideRenderer';
import { WelcomeFlow, TOTAL_WELCOME_STEPS } from './onboarding/WelcomeFlow';
import { X } from 'lucide-react';

export function OnboardingModal() {
  const { showOnboarding, dismissOnboarding, pageGuide, pageGuideOpen, closePageGuide } = useOnboarding();
  const [step, setStep] = useState(0);

  const isOpen = showOnboarding || pageGuideOpen;
  const isOnboarding = showOnboarding && !pageGuideOpen;

  const handleClose = () => {
    setStep(0);
    if (isOnboarding) {
      dismissOnboarding();
    } else {
      closePageGuide();
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  const handleNext = () => {
    if (step < TOTAL_WELCOME_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={() => {}} size="lg">
      <div className="relative">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute -top-2 -right-2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Skip"
        >
          <X className="w-5 h-5" />
        </button>

        {isOnboarding ? (
          <div>
            <WelcomeFlow currentStep={step} />
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                Skip
              </Button>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    Back
                  </Button>
                )}
                <Button size="sm" onClick={handleNext}>
                  {step < TOTAL_WELCOME_STEPS - 1 ? 'Next' : 'Get Started'}
                </Button>
              </div>
            </div>
          </div>
        ) : pageGuide ? (
          <div>
            <GuideRenderer guide={pageGuide} />
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button size="sm" onClick={handleSkip}>
                Got it
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
