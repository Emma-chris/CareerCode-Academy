import type { Guide } from '../types';

export const paymentsGuide: Guide = {
  title: 'Payments',
  icon: 'CreditCard',
  sections: [
    { icon: 'List', heading: 'Transactions', content: 'View the complete history of all payment transactions on the platform.' },
    { icon: 'Filter', heading: 'Filters', content: 'Filter payments by date range, user, course, or payment method.' },
    { icon: 'RotateCcw', heading: 'Refunds', content: 'Process refund requests and handle payment disputes.' },
    { icon: 'Download', heading: 'Export', content: 'Download transaction reports as CSV for accounting purposes.' },
  ],
};
