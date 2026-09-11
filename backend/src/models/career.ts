import { query } from '../config/db';

// ── Jobs ──

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string | null;
  type: string;
  salary_range: string | null;
  application_url: string | null;
  logo_url: string | null;
  posted_by: string | null;
  is_active: boolean;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function getActiveJobs(): Promise<Job[]> {
  const { rows } = await query<Job>(
    `SELECT * FROM jobs WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC`
  );
  return rows;
}

export async function getJobById(id: string): Promise<Job | null> {
  const { rows } = await query<Job>('SELECT * FROM jobs WHERE id = $1', [id]);
  return rows[0] || null;
}

// ── Internships ──

export interface Internship {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string | null;
  type: string;
  duration: string | null;
  requirements: string | null;
  stipend: string | null;
  application_url: string | null;
  logo_url: string | null;
  posted_by: string | null;
  is_active: boolean;
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function getActiveInternships(): Promise<Internship[]> {
  const { rows } = await query<Internship>(
    `SELECT * FROM internships WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY created_at DESC`
  );
  return rows;
}

export async function getInternshipById(id: string): Promise<Internship | null> {
  const { rows } = await query<Internship>('SELECT * FROM internships WHERE id = $1', [id]);
  return rows[0] || null;
}

// ── Alumni ──

export interface Alumni {
  id: string;
  user_id: string;
  graduation_year: number | null;
  current_company: string | null;
  current_position: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  testimonial: string | null;
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
  name?: string;
  email?: string;
  avatar?: string;
}

export async function getFeaturedAlumni(): Promise<Alumni[]> {
  const { rows } = await query<Alumni>(
    `SELECT a.*, u.name, u.email, u.avatar
     FROM alumni a
     JOIN users u ON u.id = a.user_id
     WHERE a.is_featured = true
     ORDER BY a.graduation_year DESC NULLS LAST
     LIMIT 10`
  );
  return rows;
}

export async function getAllAlumni(): Promise<Alumni[]> {
  const { rows } = await query<Alumni>(
    `SELECT a.*, u.name, u.email, u.avatar
     FROM alumni a
     JOIN users u ON u.id = a.user_id
     ORDER BY a.graduation_year DESC NULLS LAST`
  );
  return rows;
}

export async function getAlumniByUserId(userId: string): Promise<Alumni | null> {
  const { rows } = await query<Alumni>(
    'SELECT a.*, u.name, u.email, u.avatar FROM alumni a JOIN users u ON u.id = a.user_id WHERE a.user_id = $1',
    [userId]
  );
  return rows[0] || null;
}

export async function upsertAlumni(userId: string): Promise<void> {
  const { rows } = await query(
    `INSERT INTO alumni (user_id, graduation_year)
     VALUES ($1, EXTRACT(YEAR FROM NOW())::int)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
  void rows;
}

// ── Jobs admin CRUD ──

export interface JobInput {
  title: string;
  company: string;
  description: string;
  location?: string | null;
  type?: string;
  salary_range?: string | null;
  skills?: string[];
  logo_url?: string | null;
  application_url?: string | null;
  expires_at?: Date | string | null;
  posted_by?: string | null;
}

export async function createJob(input: JobInput): Promise<Job> {
  const { rows } = await query<Job>(
    `INSERT INTO jobs (title, company, description, location, type, salary_range, skills, logo_url, application_url, expires_at, posted_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      input.title, input.company, input.description, input.location || null,
      input.type || 'full-time', input.salary_range || null,
      input.skills || [], input.logo_url || null, input.application_url || null,
      input.expires_at || null,
      input.posted_by || null,
    ]
  );
  return rows[0];
}

export async function updateJob(id: string, input: Partial<JobInput>): Promise<Job | null> {
  const { rows } = await query<Job>(
    `UPDATE jobs SET
       title = COALESCE($2, title),
       company = COALESCE($3, company),
       description = COALESCE($4, description),
       location = COALESCE($5, location),
       type = COALESCE($6, type),
       salary_range = COALESCE($7, salary_range),
       skills = COALESCE($8, skills),
       logo_url = COALESCE($9, logo_url),
       application_url = COALESCE($10, application_url),
       expires_at = COALESCE($11, expires_at),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, input.title, input.company, input.description, input.location ?? null, input.type, input.salary_range ?? null, input.skills, input.logo_url ?? null, input.application_url ?? null, input.expires_at ?? null]
  );
  return rows[0] || null;
}

export async function setJobActive(id: string, isActive: boolean): Promise<Job | null> {
  const { rows } = await query<Job>(
    'UPDATE jobs SET is_active = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, isActive]
  );
  return rows[0] || null;
}

export async function deleteJob(id: string): Promise<void> {
  await query('DELETE FROM jobs WHERE id = $1', [id]);
}

export async function getAllJobsAdmin(): Promise<Job[]> {
  const { rows } = await query<Job>('SELECT * FROM jobs ORDER BY created_at DESC');
  return rows;
}

// ── Internships admin CRUD ──

export interface InternshipInput {
  title: string;
  company: string;
  description: string;
  location?: string | null;
  type?: string;
  duration?: string | null;
  requirements?: string | null;
  stipend?: string | null;
  skills?: string[];
  logo_url?: string | null;
  application_url?: string | null;
  expires_at?: Date | string | null;
  posted_by?: string | null;
}

export async function createInternship(input: InternshipInput): Promise<Internship> {
  const { rows } = await query<Internship>(
    `INSERT INTO internships (title, company, description, location, type, duration, requirements, stipend, skills, logo_url, application_url, expires_at, posted_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      input.title, input.company, input.description, input.location || null,
      input.type || 'remote', input.duration || null, input.requirements || null,
      input.stipend || null, input.skills || [], input.logo_url || null,
      input.application_url || null, input.expires_at || null,
      input.posted_by || null,
    ]
  );
  return rows[0];
}

export async function updateInternship(id: string, input: Partial<InternshipInput>): Promise<Internship | null> {
  const { rows } = await query<Internship>(
    `UPDATE internships SET
       title = COALESCE($2, title),
       company = COALESCE($3, company),
       description = COALESCE($4, description),
       location = COALESCE($5, location),
       type = COALESCE($6, type),
       duration = COALESCE($7, duration),
       requirements = COALESCE($8, requirements),
       stipend = COALESCE($9, stipend),
       skills = COALESCE($10, skills),
       logo_url = COALESCE($11, logo_url),
       application_url = COALESCE($12, application_url),
       expires_at = COALESCE($13, expires_at),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, input.title, input.company, input.description, input.location ?? null, input.type, input.duration ?? null, input.requirements ?? null, input.stipend ?? null, input.skills, input.logo_url ?? null, input.application_url ?? null, input.expires_at ?? null]
  );
  return rows[0] || null;
}

export async function setInternshipActive(id: string, isActive: boolean): Promise<Internship | null> {
  const { rows } = await query<Internship>(
    'UPDATE internships SET is_active = $2, updated_at = NOW() WHERE id = $1 RETURNING *',
    [id, isActive]
  );
  return rows[0] || null;
}

export async function deleteInternship(id: string): Promise<void> {
  await query('DELETE FROM internships WHERE id = $1', [id]);
}

export async function getAllInternshipsAdmin(): Promise<Internship[]> {
  const { rows } = await query<Internship>('SELECT * FROM internships ORDER BY created_at DESC');
  return rows;
}

// ── Applications ──

export type ApplicationStatus = 'applied' | 'reviewing' | 'interviewing' | 'offered' | 'hired' | 'rejected';

export interface Application {
  id: string;
  job_id: string | null;
  internship_id: string | null;
  user_id: string;
  cover_note: string | null;
  status: ApplicationStatus;
  status_timeline: any[];
  created_at: Date;
  updated_at: Date;
}

export async function createApplication(
  userId: string,
  input: { job_id?: string; internship_id?: string; cover_note?: string }
): Promise<Application> {
  const { rows } = await query<Application>(
    `INSERT INTO job_applications (job_id, internship_id, user_id, cover_note, status_timeline)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.job_id || null,
      input.internship_id || null,
      userId,
      input.cover_note || null,
      JSON.stringify([{ status: 'applied', at: new Date().toISOString() }]),
    ]
  );
  return rows[0];
}

export async function getApplicationByTarget(userId: string, input: { job_id?: string; internship_id?: string }): Promise<Application | null> {
  const { rows } = await query<Application>(
    `SELECT * FROM job_applications
     WHERE user_id = $1 AND job_id IS NOT DISTINCT FROM $2 AND internship_id IS NOT DISTINCT FROM $3
       AND status != 'rejected'
     LIMIT 1`,
    [userId, input.job_id || null, input.internship_id || null]
  );
  return rows[0] || null;
}

export async function getApplicationsByUser(userId: string): Promise<any[]> {
  const { rows } = await query(
    `SELECT a.*,
       COALESCE(j.title, i.title) AS role_title,
       COALESCE(j.company, i.company) AS company,
       COALESCE(j.logo_url, i.logo_url) AS logo_url,
       j.skills AS job_skills
     FROM job_applications a
     LEFT JOIN jobs j ON j.id = a.job_id
     LEFT JOIN internships i ON i.id = a.internship_id
     WHERE a.user_id = $1
     ORDER BY a.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getApplicationsAdmin(filter?: { status?: string }): Promise<any[]> {
  const { rows } = await query(
    `SELECT a.*,
       u.name AS applicant_name, u.email AS applicant_email, u.avatar AS applicant_avatar,
       COALESCE(j.title, i.title) AS role_title,
       COALESCE(j.company, i.company) AS company
     FROM job_applications a
     JOIN users u ON u.id = a.user_id
     LEFT JOIN jobs j ON j.id = a.job_id
     LEFT JOIN internships i ON i.id = a.internship_id
     WHERE ($1::text IS NULL OR a.status = $1)
     ORDER BY a.created_at DESC`,
    [filter?.status || null]
  );
  return rows;
}

export async function getApplicationById(id: string): Promise<Application | null> {
  const { rows } = await query<Application>('SELECT * FROM job_applications WHERE id = $1', [id]);
  return rows[0] || null;
}

export async function updateApplicationStatus(id: string, status: ApplicationStatus, note?: string): Promise<Application | null> {
  const { rows } = await query<Application>(
    `UPDATE job_applications SET
       status = $2,
       status_timeline = status_timeline || $3::jsonb,
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id, status, JSON.stringify([{ status, note: note || null, at: new Date().toISOString() }])]
  );
  return rows[0] || null;
}

// ── Matching ──

export async function getUserSkillSet(userId: string): Promise<string[]> {
  const skills = new Set<string>();
  const add = (values: any[]) => {
    for (const v of values) {
      if (!v) continue;
      String(v).toLowerCase().split(/[^a-z0-9+#.-]+/).filter(Boolean).forEach((t) => {
        if (t.length > 1) skills.add(t);
      });
    }
  };

  try {
    const { rows } = await query(
      `SELECT DISTINCT c.category FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = $1 AND e.completed = true`,
      [userId]
    );
    add(rows.map((r) => r.category));
  } catch {}

  for (const table of ['portfolio_items', 'projects']) {
    try {
      const { rows } = await query(`SELECT skills FROM ${table} WHERE user_id = $1`, [userId]);
      rows.forEach((r) => add(r.skills || []));
    } catch {}
  }

  return Array.from(skills);
}

function scoreListing(listing: any, userSkills: string[]): number {
  const listingSkills = (listing.skills || []).map((s: string) => s.toLowerCase());
  const overlap = listingSkills.filter((s: string) => userSkills.includes(s)).length;
  const titleTokens = (listing.title || '').toLowerCase().split(/[^a-z0-9+#]/).filter(Boolean);
  const keywordHits = titleTokens.filter((t: string) => userSkills.includes(t)).length;
  return overlap * 2 + keywordHits;
}

export async function matchRolesForUser(userId: string): Promise<any[]> {
  const userSkills = await getUserSkillSet(userId);
  const [jobs, internships] = await Promise.all([
    getActiveJobs(),
    getActiveInternships(),
  ]);
  const scored = [
    ...jobs.map((j) => ({ ...j, kind: 'job', score: scoreListing(j, userSkills) })),
    ...internships.map((i) => ({ ...i, kind: 'internship', score: scoreListing(i, userSkills) })),
  ]
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  return scored;
}

// ── Outcomes (S6) ──

export async function getCareerOutcomes(): Promise<any> {
  const count = async (sql: string): Promise<number> => {
    try {
      const { rows } = await query(sql);
      return Number(rows[0]?.n) || 0;
    } catch {
      return 0;
    }
  };

  const [applied, reviewing, interviewing, offered, hired, rejected, alumni, featuredJobs] = await Promise.all([
    count(`SELECT COUNT(*)::int AS n FROM job_applications`),
    count(`SELECT COUNT(*)::int AS n FROM job_applications WHERE status = 'reviewing'`),
    count(`SELECT COUNT(*)::int AS n FROM job_applications WHERE status = 'interviewing'`),
    count(`SELECT COUNT(*)::int AS n FROM job_applications WHERE status = 'offered'`),
    count(`SELECT COUNT(*)::int AS n FROM job_applications WHERE status = 'hired'`),
    count(`SELECT COUNT(*)::int AS n FROM job_applications WHERE status = 'rejected'`),
    count(`SELECT COUNT(*)::int AS n FROM alumni`),
    count(`SELECT COUNT(*)::int AS n FROM jobs WHERE is_active = true`),
  ]);

  return { applied, reviewing, interviewing, offered, hired, rejected, alumni, featuredJobs };
}
