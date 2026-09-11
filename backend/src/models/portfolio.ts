import { query } from '../config/db';
import { ConflictError, NotFoundError } from '../utils/errors';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'learner';
}

export async function ensureUsername(userId: string): Promise<string> {
  const { rows } = await query('SELECT username, name FROM users WHERE id = $1', [userId]);
  if (rows[0]?.username) return rows[0].username;
  const base = slugify(rows[0]?.name || 'learner');
  const { rows: updated } = await query(
    `UPDATE users
     SET username = $2
     WHERE id = $1
       AND (username IS NULL OR username = '')
     RETURNING username`,
    [userId, `${base}-${userId.slice(0, 6)}`]
  );
  if (updated[0]?.username) return updated[0].username;
  return `${base}-${userId.slice(0, 6)}`;
}

// ── Portfolio items ──

export interface PortfolioItem {
  id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  skills: string[];
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PortfolioItemInput {
  title: string;
  description?: string | null;
  url?: string | null;
  image_url?: string | null;
  skills?: string[];
  is_public?: boolean;
  project_id?: string | null;
}

export async function getMyPortfolio(userId: string): Promise<any> {
  const [userRes, itemsRes, certRes, projectsRes, alumniRes] = await Promise.all([
    query('SELECT id, name, email, avatar, bio, username, portfolio_public FROM users WHERE id = $1', [userId]),
    query('SELECT * FROM portfolio_items WHERE user_id = $1 ORDER BY created_at DESC', [userId]),
    query(
      `SELECT c.id, c.title, c.slug, cert.issued_at, cert.verification_code
       FROM certificates cert
       JOIN courses c ON c.id = cert.course_id
       WHERE cert.user_id = $1 AND cert.revoked = false
       ORDER BY cert.issued_at DESC`,
      [userId]
    ),
    query(`SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC`, [userId]),
    query(`SELECT * FROM alumni WHERE user_id = $1`, [userId]),
  ]);

  const user = userRes.rows[0];
  const items: PortfolioItem[] = itemsRes.rows;
  const projects = projectsRes.rows;
  const skills = Array.from(
    new Set([
      ...items.flatMap((i) => i.skills || []),
      ...projects.flatMap((p) => p.skills || []),
    ])
  );

  return {
    user,
    username: user?.username || (await ensureUsername(userId)),
    items,
    certificates: certRes.rows,
    projects,
    alumni: alumniRes.rows[0] || null,
    skills,
  };
}

export async function updateProfilePublic(userId: string, portfolio_public: boolean): Promise<void> {
  await query('UPDATE users SET portfolio_public = $2, updated_at = NOW() WHERE id = $1', [userId, portfolio_public]);
}

export async function getPublicProfileByUsername(username: string): Promise<any | null> {
  const userRes = await query(
    `SELECT id, name, avatar, bio, username, portfolio_public FROM users WHERE username = $1`,
    [username]
  );
  const user = userRes.rows[0];
  if (!user) return null;

  const [itemsRes, certRes, alumniRes] = await Promise.all([
    query(
      'SELECT id, title, description, url, image_url, skills, created_at FROM portfolio_items WHERE user_id = $1 AND is_public = true ORDER BY created_at DESC',
      [user.id]
    ),
    query(
      `SELECT c.title, cert.issued_at
       FROM certificates cert
       JOIN courses c ON c.id = cert.course_id
       WHERE cert.user_id = $1 AND cert.revoked = false
       ORDER BY cert.issued_at DESC`,
      [user.id]
    ),
    query(
      `SELECT current_company, current_position, linkedin_url, portfolio_url, graduation_year
       FROM alumni WHERE user_id = $1`,
      [user.id]
    ),
  ]);

  const items = itemsRes.rows;
  const visible = user.portfolio_public || items.length > 0;
  if (!visible) return null;

  const skills = Array.from(
    new Set(items.flatMap((i: any) => i.skills || []))
  );

  return {
    user: { id: user.id, name: user.name, avatar: user.avatar, bio: user.bio, username: user.username },
    items,
    certificates: certRes.rows,
    alumni: alumniRes.rows[0] || null,
    skills,
  };
}

export async function createPortfolioItem(userId: string, input: PortfolioItemInput): Promise<PortfolioItem> {
  const { rows } = await query<PortfolioItem>(
    `INSERT INTO portfolio_items (user_id, project_id, title, description, url, image_url, skills, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId,
      input.project_id || null,
      input.title,
      input.description || null,
      input.url || null,
      input.image_url || null,
      input.skills || [],
      input.is_public ?? true,
    ]
  );
  return rows[0];
}

export async function updatePortfolioItem(userId: string, id: string, input: Partial<PortfolioItemInput>): Promise<PortfolioItem | null> {
  const { rows } = await query<PortfolioItem>(
    `UPDATE portfolio_items SET
       title = COALESCE($3, title),
       description = COALESCE($4, description),
       url = COALESCE($5, url),
       image_url = COALESCE($6, image_url),
       skills = COALESCE($7, skills),
       is_public = COALESCE($8, is_public),
       updated_at = NOW()
     WHERE id = $1 AND user_id = $2 RETURNING *`,
    [
      id, userId,
      input.title, input.description ?? null, input.url ?? null,
      input.image_url ?? null, input.skills, input.is_public ?? null,
    ]
  );
  return rows[0] || null;
}

export async function deletePortfolioItem(userId: string, id: string): Promise<void> {
  const { rows } = await query(
    'DELETE FROM portfolio_items WHERE id = $1 AND user_id = $2 RETURNING id',
    [id, userId]
  );
  if (rows.length === 0) throw new NotFoundError('Portfolio item');
}

// ── Projects ──

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string;
  source_url: string | null;
  demo_url: string | null;
  image_url: string | null;
  skills: string[];
  course_id: string | null;
  status: string;
  reviewer_id: string | null;
  review_feedback: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ProjectInput {
  title: string;
  description: string;
  source_url?: string | null;
  demo_url?: string | null;
  image_url?: string | null;
  skills?: string[];
  course_id?: string | null;
}

export async function createProject(userId: string, input: ProjectInput): Promise<Project> {
  const { rows } = await query<Project>(
    `INSERT INTO projects (user_id, title, description, source_url, demo_url, image_url, skills, course_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      userId, input.title, input.description, input.source_url || null,
      input.demo_url || null, input.image_url || null, input.skills || [], input.course_id || null,
    ]
  );
  return rows[0];
}

export async function getProjectsByUser(userId: string): Promise<Project[]> {
  const { rows } = await query<Project>(
    `SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getProjectById(id: string): Promise<Project | null> {
  const { rows } = await query<Project>('SELECT * FROM projects WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function getProjectsForReview(): Promise<any[]> {
  const { rows } = await query(
    `SELECT p.*, u.name AS student_name, u.email AS student_email, u.avatar AS student_avatar,
            c.title AS course_title
     FROM projects p
     JOIN users u ON u.id = p.user_id
     LEFT JOIN courses c ON c.id = p.course_id
     ORDER BY (p.status = 'submitted') DESC, p.created_at DESC`
  );
  return rows;
}

export async function reviewProject(
  projectId: string,
  reviewerId: string,
  status: 'approved' | 'rejected',
  feedback?: string
): Promise<Project> {
  const { rows } = await query<Project>(
    `UPDATE projects
     SET status = $2, reviewer_id = $3, review_feedback = $4, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [projectId, status, reviewerId, feedback || null]
  );
  if (!rows[0]) throw new NotFoundError('Project');

  if (status === 'approved') {
    const existing = await query('SELECT id FROM portfolio_items WHERE project_id = $1', [projectId]);
    if (existing.rows.length === 0) {
      const p = rows[0];
      await createPortfolioItem(p.user_id, {
        title: p.title,
        description: p.description,
        url: p.demo_url || p.source_url,
        image_url: p.image_url,
        skills: p.skills,
        project_id: p.id,
      });
    }
  }

  return rows[0];
}

export async function projectDuplicateApproved(userId: string, title: string): Promise<string | null> {
  const { rows } = await query(
    'SELECT status FROM projects WHERE user_id = $1 AND LOWER(title) = LOWER($2) LIMIT 1',
    [userId, title]
  );
  return rows[0]?.status ?? null;
}

export { ConflictError };