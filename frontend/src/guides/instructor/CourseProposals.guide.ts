import type { Guide } from '../types';

export const courseProposalsGuide: Guide = {
  title: 'Course Proposals',
  icon: 'ClipboardList',
  sections: [
    { icon: 'Plus', heading: 'Submit Proposal', content: 'Submit a new course idea for admin approval. Include topic, audience, and outline.' },
    { icon: 'Clock', heading: 'Review Status', content: 'Track your proposal status: pending, approved, or rejected with feedback.' },
    { icon: 'Edit', heading: 'Revise', content: 'If rejected, revise your proposal based on admin feedback and resubmit.' },
  ],
};
