import React from 'react';
import { Search, LayoutDashboard, Compass, Rocket } from 'lucide-react';

export interface WelcomeStep {
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

const steps: WelcomeStep[] = [
  {
    title: 'Welcome to CareerCode Academy',
    subtitle: "Let's get you started in under 60 seconds",
    content: (
      <div className="text-center py-6">
        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4">
          <Rocket className="w-8 h-8 text-white" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
          This quick tour will show you everything you need to start your learning journey.
        </p>
      </div>
    ),
  },
  {
    title: 'Find Your First Course',
    subtitle: 'Browse our catalog of 100+ courses',
    content: (
      <div className="space-y-4 py-2">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
            <Search className="w-4 h-4 text-primary-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Search & Filter</p>
            <p className="text-xs text-gray-500 mt-0.5">Search by keyword, filter by category or difficulty level.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 text-primary-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Read Reviews</p>
            <p className="text-xs text-gray-500 mt-0.5">See ratings, student counts, and detailed descriptions before enrolling.</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center pt-2">Head to the <strong>Courses</strong> page to get started.</p>
      </div>
    ),
  },
  {
    title: 'Your Dashboard',
    subtitle: 'Your mission control for learning',
    content: (
      <div className="space-y-4 py-2">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-4 h-4 text-primary-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Track Everything</p>
            <p className="text-xs text-gray-500 mt-0.5">XP points, daily streaks, course progress, and leaderboard rank all in one place.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 text-primary-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Quick Access</p>
            <p className="text-xs text-gray-500 mt-0.5">Recent courses, recommended content, and upcoming deadlines.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Start Learning',
    subtitle: 'Your journey begins now',
    content: (
      <div className="space-y-4 py-2">
        <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
            <Rocket className="w-4 h-4 text-primary-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Enroll & Watch</p>
            <p className="text-xs text-gray-500 mt-0.5">Enroll in any course, watch video lessons with adjustable speed, and take notes.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <div className="w-9 h-9 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-4 h-4 text-primary-500" />
          </div>
          <div>
            <p className="text-sm font-medium">Quizzes, Assignments & Exams</p>
            <p className="text-xs text-gray-500 mt-0.5">Test your knowledge, submit work for grading, and earn certificates.</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center pt-2">Use the <strong>?</strong> button on any page for a quick guide.</p>
      </div>
    ),
  },
];

interface WelcomeFlowProps {
  currentStep: number;
}

export function WelcomeFlow({ currentStep }: WelcomeFlowProps) {
  const step = steps[currentStep];
  return (
    <div>
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold">{step.title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{step.subtitle}</p>
      </div>
      {step.content}
      <div className="flex justify-center gap-1.5 mt-6">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentStep
                ? 'w-6 bg-primary-500'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export const TOTAL_WELCOME_STEPS = steps.length;
