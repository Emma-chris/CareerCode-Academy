import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

function applyDarkMode(value: boolean) {
  if (value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

const initialDarkMode = true;
applyDarkMode(initialDarkMode);

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      darkMode: true,

      toggleDarkMode: () => {
        // Light mode removed
      },

      setDarkMode: (value) => {
        // Light mode removed
      },
    }),
    {
      name: 'careercode-theme',
    }
  )
);
