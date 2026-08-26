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
