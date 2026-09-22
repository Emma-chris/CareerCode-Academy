import dotenv from 'dotenv';
dotenv.config();

import { query } from './config/db';
import * as BoardModel from './models/board';

const members = [
  {
    name: 'Dr. Amara Okafor',
    title: 'Chairperson of the Board',
    bio: 'EdTech investor and former engineering leader with 20+ years shaping digital-skills programs across Africa and the US.',
    avatar_url: null,
    sort_order: 1,
    is_active: true,
  },
  {
    name: 'David Mensah',
    title: 'Co-Founder & CEO',
    bio: 'Co-founded CareerCode to close the gap between classroom learning and real industry hiring.',
    avatar_url: null,
    sort_order: 2,
    is_active: true,
  },
  {
    name: 'Sarah Chen',
    title: 'Independent Director',
    bio: 'Trust and safety specialist advising platforms on learner protection, content integrity and data governance.',
    avatar_url: null,
    sort_order: 3,
    is_active: true,
  },
  {
    name: 'Tunde Bakare',
    title: 'Finance Director',
    bio: 'Chartered accountant guiding the board on pricing, financial controls and revenue oversight.',
    avatar_url: null,
    sort_order: 4,
    is_active: true,
  },
];

const policies: {
  title: string;
  category: BoardModel.BoardPolicyCategory;
  summary: string;
  body: string;
  status: BoardModel.BoardPolicyStatus;
  published: boolean;
}[] = [
  {
    title: 'Pricing Transparency & Discount Policy',
    category: 'pricing',
    summary: 'Courses are priced at full price. Discounts are reserved exclusively for time-boxed promotional events approved by the board.',
    body: `CareerCode Academy sells courses at full price. Individual or standing per-course discounts are not offered.\n\nDiscounts are available only through special promotional events (for example launch campaigns, seasonal sales or partnership offers). Every promotion is time-boxed, recorded on payments for audit, and must be created through the promotions module by an administrator.\n\nThis policy exists to keep pricing predictable for learners and instructors, and to make sure a discount is a deliberate, board-visible decision rather than a default.`,
    status: 'approved',
    published: true,
  },
  {
    title: 'Content Quality & Review Oversight',
    category: 'content',
    summary: 'All published courses pass instructor review before they become visible to learners.',
    body: `Courses proceed from draft through pending_review before publication. Reviewers confirm accuracy, appropriate length and production quality. The board reviews aggregate quality metrics (approval rates, completion rates, report volume) quarterly.`,
    status: 'approved',
    published: true,
  },
  {
    title: 'Learner Data Governance',
    category: 'data',
    summary: 'Learner data is protected, never sold, and accessed only for platform operations and support.',
    body: `Learner records are processed only for the operation of the platform (progress, payments, certificates and support). Data is not sold or shared with third parties for marketing. Access to learner data requires an admin role and is audited.`,
    status: 'pending_review',
    published: false,
  },
];

async function seed() {
  console.log('Seeding board of directors oversight...');

  for (const m of members) {
    const existing = await query('SELECT id FROM board_members WHERE name = $1', [m.name]);
    if (existing.rows.length > 0) {
      await BoardModel.updateBoardMember(existing.rows[0].id, m);
    } else {
      await BoardModel.createBoardMember(m);
    }
  }
  console.log(`✓ ${members.length} board members`);

  for (const p of policies) {
    const existing = await query('SELECT id FROM board_policies WHERE title = $1', [p.title]);
    if (existing.rows.length > 0) {
      await BoardModel.updatePolicy(existing.rows[0].id, p);
    } else {
      await BoardModel.createPolicy({ ...p, proposed_by: null });
    }
  }
  console.log(`✓ ${policies.length} board policies`);

  console.log('Board governance seeded.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('SEED BOARD FAILED:', err);
  process.exit(1);
});