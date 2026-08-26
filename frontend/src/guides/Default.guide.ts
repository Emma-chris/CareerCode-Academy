import type { Guide } from './types';

export function defaultGuide(role: string): Guide {
  return {
    title: `${role} Page`,
    icon: 'HelpCircle',
    sections: [
      {
        icon: 'Info',
        heading: 'About This Page',
        content: `This is a standard ${role.toLowerCase()} page. Use the sidebar navigation to access all available features.`,
      },
      {
        icon: 'Compass',
        heading: 'Need More Help?',
        content: 'Check the Getting Started guide or visit the Help Center for detailed documentation.',
      },
    ],
  };
}
