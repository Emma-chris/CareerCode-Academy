import type { Guide } from '../types';

export const adminPayoutsGuide: Guide = {
  title: 'Payouts',
  icon: 'DollarSign',
  sections: [
    { icon: 'List', heading: 'Pending Requests', content: 'Review instructor payout requests awaiting approval.' },
    { icon: 'CheckCircle', heading: 'Approve or Reject', content: 'Process payout requests by approving or rejecting with reason.' },
    { icon: 'History', heading: 'History', content: 'View completed payouts and track platform commission on each transaction.' },
  ],
};
