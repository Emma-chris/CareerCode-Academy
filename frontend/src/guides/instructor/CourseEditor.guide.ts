import type { Guide } from '../types';

export const courseEditorGuide: Guide = {
  title: 'Course Editor',
  icon: 'Edit',
  sections: [
    { icon: 'Info', heading: 'Course Details', content: 'Set the title, description, category, price, and thumbnail for your course.' },
    { icon: 'FolderTree', heading: 'Modules & Lessons', content: 'Organize your course into modules, each containing lessons. Drag to reorder.' },
    { icon: 'Video', heading: 'Video Lessons', content: 'Add YouTube video URLs for each lesson. Students watch directly in the player.' },
    { icon: 'FileText', heading: 'Resources', content: 'Attach downloadable resources like code files, PDFs, or reading materials.' },
    { icon: 'CheckCircle', heading: 'Learning Objectives', content: 'Define what students will learn. Objectives show at the top of each lesson.' },
    { icon: 'Eye', heading: 'Preview', content: 'Use the preview button to see your course from a student perspective.' },
    { icon: 'Save', heading: 'Save & Publish', content: 'Save as draft to continue later, or publish when your course is ready.' },
  ],
};
