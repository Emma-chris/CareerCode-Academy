import type { Guide } from '../types';

export const studentMessagesGuide: Guide = {
  title: 'Messages',
  icon: 'MessageSquare',
  sections: [
    { icon: 'MessageSquare', heading: 'Conversations', content: 'Chat with instructors and peers in real-time via WebSocket-powered messaging.' },
    { icon: 'Plus', heading: 'New Message', content: 'Start a new conversation by searching for a user by name.' },
    { icon: 'Paperclip', heading: 'Share Files', content: 'Attach files, images, or code snippets directly in your messages.' },
    { icon: 'Search', heading: 'Search History', content: 'Search past conversations to find specific messages or threads.' },
  ],
};
