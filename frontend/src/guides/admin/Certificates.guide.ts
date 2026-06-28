import type { Guide } from '../types';

export const adminCertificatesGuide: Guide = {
  title: 'Certificates',
  icon: 'Award',
  sections: [
    { icon: 'List', heading: 'Issued Certificates', content: 'View all certificates issued to students across the platform.' },
    { icon: 'Ban', heading: 'Revoke', content: 'Revoke certificates if needed for policy violations or course refunds.' },
    { icon: 'Search', heading: 'Verification', content: 'Verify certificate authenticity using the unique verification code.' },
  ],
};
