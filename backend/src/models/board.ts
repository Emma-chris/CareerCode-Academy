import { query } from '../config/db';
import { slugify } from '../utils/helpers';

export interface BoardMember {
  id: string;
  name: string;
  title: string;
  bio: string | null;
  avatar_url: string | null;
  sort_order: number;
  is_active: boolean;
  joined_at: Date;
  created_at: Date;
  updated_at: Date;
}

export type BoardPolicyStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';
export type BoardPolicyCategory = 'pricing' | 'content' | 'community' | 'data' | 'finance' | 'operations' | 'governance';

export interface BoardPolicy {
  id: string;
  title: string;
  slug: string;
  category: BoardPolicyCategory;
  summary: string | null;
  body: string;
  status: BoardPolicyStatus;
  version: number;
  published: boolean;
  proposed_by: string | null;
  approved_by: string | null;
  decided_at: Date | null;
  decision_notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BoardResolution {
  id: string;
  resolution_number: string;
  title: string;
  summary: string | null;
  body: string | null;
  passed: boolean;
  meeting_date: Date;
  passed_at: Date | null;
  recorded_by: string | null;
  created_at: Date;
}

// ---- Board members ----

export async function getActiveBoardMembers(): Promise<BoardMember[]> {
  const { rows } = await query<BoardMember>(
    `SELECT * FROM board_members WHERE is_active = true ORDER BY sort_order ASC, joined_at ASC`
  );
  return rows;
}

export async function listBoardMembers(): Promise<BoardMember[]> {
  const { rows } = await query<BoardMember>(`SELECT * FROM board_members ORDER BY sort_order ASC, created_at DESC`);
  return rows;
}

export async function getBoardMemberById(id: string): Promise<BoardMember | null> {
  const { rows } = await query<BoardMember>('SELECT * FROM board_members WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function createBoardMember(input: Omit<BoardMember, 'id' | 'joined_at' | 'created_at' | 'updated_at'>): Promise<BoardMember> {
  const { rows } = await query<BoardMember>(
    `INSERT INTO board_members (name, title, bio, avatar_url, sort_order, is_active)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [input.name, input.title, input.bio || null, input.avatar_url || null, input.sort_order ?? 0, input.is_active ?? true]
  );
  return rows[0];
}

export async function updateBoardMember(id: string, input: Partial<Omit<BoardMember, 'id' | 'created_at' | 'updated_at'>>): Promise<BoardMember | null> {
  const allowed: (keyof Omit<BoardMember, 'id' | 'created_at' | 'updated_at'>)[] = ['name', 'title', 'bio', 'avatar_url', 'sort_order', 'is_active'];
  const sets: string[] = [];
  const values: unknown[] = [];
  allowed.forEach((key) => {
    if (input[key] !== undefined) {
      values.push(input[key]);
      sets.push(`${key} = $${values.length}`);
    }
  });
  if (!sets.length) return getBoardMemberById(id);
  sets.push(`updated_at = NOW()`);
  values.push(id);
  const { rows } = await query<BoardMember>(`UPDATE board_members SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
  return rows[0] || null;
}

export async function deleteBoardMember(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM board_members WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

// ---- Board policies ----

export async function getPublishedPolicies(): Promise<BoardPolicy[]> {
  const { rows } = await query<BoardPolicy>(
    `SELECT * FROM board_policies WHERE published = true AND status = 'approved' ORDER BY updated_at DESC`
  );
  return rows;
}

export async function getPolicyBySlug(slug: string, publishedOnly = false): Promise<BoardPolicy | null> {
  const { rows } = await query<BoardPolicy>(
    `SELECT * FROM board_policies WHERE slug = $1 ${publishedOnly ? "AND published = true AND status = 'approved'" : ''}`,
    [slug]
  );
  return rows[0] || null;
}

export async function listPolicies(): Promise<BoardPolicy[]> {
  const { rows } = await query<BoardPolicy>(`SELECT * FROM board_policies ORDER BY updated_at DESC`);
  return rows;
}

export async function getPolicyById(id: string): Promise<BoardPolicy | null> {
  const { rows } = await query<BoardPolicy>('SELECT * FROM board_policies WHERE id = $1', [id]);
  return rows[0] || null;
}

const policyColumns = ['title', 'category', 'summary', 'body', 'status', 'version', 'published', 'decision_notes'] as const;

export async function createPolicy(input: {
  title: string;
  category: BoardPolicyCategory;
  summary?: string;
  body: string;
  status?: BoardPolicyStatus;
  proposed_by?: string | null;
}): Promise<BoardPolicy> {
  const slug = slugify(input.title);
  const { rows } = await query<BoardPolicy>(
    `INSERT INTO board_policies (title, slug, category, summary, body, status, proposed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [input.title, slug, input.category, input.summary || null, input.body, input.status || 'draft', input.proposed_by || null]
  );
  return rows[0];
}

export async function updatePolicy(id: string, input: Record<string, any>): Promise<BoardPolicy | null> {
  const existing = await getPolicyById(id);
  if (!existing) return null;
  const sets: string[] = [];
  const values: unknown[] = [];
  const allowed: string[] = [...policyColumns, 'title'];
  allowed.forEach((key) => {
    if (input[key] !== undefined) {
      values.push(input[key] === null ? null : input[key]);
      sets.push(`${key} = $${values.length}`);
    }
  });
  if (input.title) {
    sets.push(`slug = $${values.length + 1}`);
    values.push(slugify(input.title));
  }
  if (!sets.length) return existing;
  sets.push(`updated_at = NOW()`);
  values.push(id);
  const { rows } = await query<BoardPolicy>(`UPDATE board_policies SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
  return rows[0] || null;
}

export async function decidePolicy(id: string, status: 'approved' | 'rejected', approvedBy: string, notes?: string, publish = false): Promise<BoardPolicy | null> {
  const { rows } = await query<BoardPolicy>(
    `UPDATE board_policies
     SET status = $1, approved_by = $2, decided_at = NOW(), decision_notes = COALESCE($3, decision_notes),
         published = $4, version = CASE WHEN $1 = 'approved' THEN version + 1 ELSE version END,
         updated_at = NOW()
     WHERE id = $5 RETURNING *`,
    [status, approvedBy, notes || null, publish, id]
  );
  return rows[0] || null;
}

export async function deletePolicy(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM board_policies WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

// ---- Board resolutions ----

export async function listResolutions(): Promise<BoardResolution[]> {
  const { rows } = await query<BoardResolution>(`SELECT * FROM board_resolutions ORDER BY meeting_date DESC, created_at DESC`);
  return rows;
}

export async function createResolution(input: {
  title: string;
  summary?: string;
  body?: string;
  passed?: boolean;
  meeting_date: Date;
  recorded_by?: string | null;
}): Promise<BoardResolution> {
  const year = new Date(input.meeting_date).getFullYear();
  const { rows: countRows } = await query(`SELECT COUNT(*) FROM board_resolutions WHERE EXTRACT(YEAR FROM meeting_date) = $1`, [year]);
  const seq = String(parseInt(countRows[0].count, 10) + 1).padStart(3, '0');
  const resolution_number = `RES-${year}-${seq}`;
  const { rows } = await query<BoardResolution>(
    `INSERT INTO board_resolutions (resolution_number, title, summary, body, passed, meeting_date, passed_at, recorded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [resolution_number, input.title, input.summary || null, input.body || null, input.passed ?? true, input.meeting_date, input.passed ? new Date() : null, input.recorded_by || null]
  );
  return rows[0];
}

export async function deleteResolution(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM board_resolutions WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

// ---- Oversight summary for the board dashboard ----

export interface BoardOversightSummary {
  members: {
    active: number;
    total: number;
  };
  policies: {
    pendingReview: number;
    approved: number;
    rejected: number;
    published: number;
  };
  operations: {
    totalRevenue: number;
    totalEnrollments: number;
    totalStudents: number;
    activePromotions: number;
    publishedCourses: number;
    certificatesIssued: number;
    pendingInstructorApplications: number;
  };
  recentResolutions: BoardResolution[];
  recentPolicies: BoardPolicy[];
}

export async function getBoardOversightSummary(): Promise<BoardOversightSummary> {
  const [members, policies, ops, resolutions, recentPolicies] = await Promise.all([
    query(`SELECT
       COUNT(*) FILTER (WHERE is_active = true)::int as active,
       COUNT(*)::int as total
     FROM board_members`),
    query(`SELECT
       COUNT(*) FILTER (WHERE status = 'pending_review')::int as pending_review,
       COUNT(*) FILTER (WHERE status = 'approved')::int as approved,
       COUNT(*) FILTER (WHERE status = 'rejected')::int as rejected,
       COUNT(*) FILTER (WHERE status = 'approved' AND published = true)::int as published
     FROM board_policies`),
    query(`SELECT
       (SELECT COALESCE(SUM(amount), 0)::float FROM payments WHERE status = 'completed') as total_revenue,
       (SELECT COUNT(*)::int FROM enrollments) as total_enrollments,
       (SELECT COUNT(*)::int FROM users WHERE role = 'student') as total_students,
       (SELECT COUNT(*)::int FROM promotions WHERE is_active = true AND starts_at <= NOW() AND ends_at > NOW()) as active_promotions,
       (SELECT COUNT(*)::int FROM courses WHERE published = true) as published_courses,
       (SELECT COUNT(*)::int FROM certificates) as certificates_issued,
       (SELECT COUNT(*)::int FROM instructor_applications WHERE status = 'pending') as pending_instructor_applications`),
    query<BoardResolution>(`SELECT * FROM board_resolutions ORDER BY meeting_date DESC, created_at DESC LIMIT 5`),
    query<BoardPolicy>(`SELECT * FROM board_policies ORDER BY updated_at DESC LIMIT 8`),
  ]);

  return {
    members: members.rows[0],
    policies: policies.rows[0],
    operations: ops.rows[0],
    recentResolutions: resolutions.rows,
    recentPolicies: recentPolicies.rows,
  };
}