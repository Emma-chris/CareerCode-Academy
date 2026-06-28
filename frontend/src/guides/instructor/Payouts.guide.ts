import type { Guide } from '../types';

export const instructorPayoutsGuide: Guide = {
  title: 'Payouts',
  icon: 'DollarSign',
  sections: [
    { icon: 'Wallet', heading: 'Balance', content: 'View your available balance and total lifetime earnings from course sales.' },
    { icon: 'Send', heading: 'Request Payout', content: 'Submit a payout request to withdraw your available balance.' },
    { icon: 'History', heading: 'History', content: 'Track past payouts and their status: pending, processing, or completed.' },
  ],
};
