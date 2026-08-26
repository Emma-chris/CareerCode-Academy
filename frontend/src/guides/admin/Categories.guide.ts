import type { Guide } from '../types';

export const categoriesGuide: Guide = {
  title: 'Categories',
  icon: 'Layers',
  sections: [
    { icon: 'Plus', heading: 'Create Categories', content: 'Add new course categories to organize the catalog (e.g., Web Development, Data Science).' },
    { icon: 'GitBranch', heading: 'Parent-Child', content: 'Set parent-child relationships between categories for hierarchical organization.' },
    { icon: 'Edit', heading: 'Edit & Delete', content: 'Update category names or remove unused categories.' },
  ],
};
