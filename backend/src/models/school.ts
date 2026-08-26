import { query } from '../config/db';

export interface School {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface Program {
  id: string;
  school_id: string;
  name: string;
  slug: string;
  description: string | null;
  career_outcomes: string[];
  duration: string | null;
  icon: string | null;
  color: string | null;
  sort_order: number;
  main_course_id: string | null;
  main_course_title?: string | null;
  main_course_slug?: string | null;
  main_course_thumbnail?: string | null;
  created_at: Date;
  updated_at: Date;
  course_count?: number;
  school_name?: string;
  school_slug?: string;
}

export interface ProgramCourse {
  id: string;
  program_id: string;
  course_id: string;
  order_index: number;
}

// ── Schools ──

export async function getAllSchools(): Promise<School[]> {
  const { rows } = await query<School>(
    `SELECT s.*, COUNT(p.id)::int as program_count
     FROM schools s
     LEFT JOIN programs p ON p.school_id = s.id
     GROUP BY s.id
     ORDER BY s.sort_order ASC`
  );
  return rows;
}

export async function getSchoolBySlug(slug: string): Promise<School | null> {
  const { rows } = await query<School>('SELECT * FROM schools WHERE slug = $1', [slug]);
  return rows[0] || null;
}

export async function getSchoolById(id: string): Promise<School | null> {
  const { rows } = await query<School>('SELECT * FROM schools WHERE id = $1', [id]);
  return rows[0] || null;
}

// ── Programs ──

export async function getProgramsBySchool(schoolId: string): Promise<Program[]> {
  const { rows } = await query<Program>(
    `SELECT p.*, COUNT(pc.id)::int as course_count,
            mc.title as main_course_title,
            mc.slug as main_course_slug,
            mc.thumbnail as main_course_thumbnail
     FROM programs p
     LEFT JOIN program_courses pc ON pc.program_id = p.id
     LEFT JOIN courses mc ON mc.id = p.main_course_id
     WHERE p.school_id = $1
     GROUP BY p.id, mc.title, mc.slug, mc.thumbnail
     ORDER BY p.sort_order ASC`,
    [schoolId]
  );
  return rows;
}

export async function getProgramBySlug(slug: string): Promise<Program | null> {
  const { rows } = await query<Program>(
    `SELECT p.*, s.name as school_name, s.slug as school_slug,
            COUNT(pc.id)::int as course_count,
            mc.title as main_course_title,
            mc.slug as main_course_slug,
            mc.thumbnail as main_course_thumbnail
     FROM programs p
     JOIN schools s ON s.id = p.school_id
     LEFT JOIN program_courses pc ON pc.program_id = p.id
     LEFT JOIN courses mc ON mc.id = p.main_course_id
     WHERE p.slug = $1
     GROUP BY p.id, s.name, s.slug, mc.title, mc.slug, mc.thumbnail`,
    [slug]
  );
  return rows[0] || null;
}

export async function getProgramById(id: string): Promise<Program | null> {
  const { rows } = await query<Program>(
    `SELECT p.*, s.name as school_name, s.slug as school_slug,
            mc.title as main_course_title,
            mc.slug as main_course_slug,
            mc.thumbnail as main_course_thumbnail
     FROM programs p
     JOIN schools s ON s.id = p.school_id
     LEFT JOIN courses mc ON mc.id = p.main_course_id
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function getAllPrograms(): Promise<Program[]> {
  const { rows } = await query<Program>(
    `SELECT p.*, s.name as school_name, s.slug as school_slug,
            COUNT(pc.id)::int as course_count,
            mc.title as main_course_title,
            mc.slug as main_course_slug,
            mc.thumbnail as main_course_thumbnail
     FROM programs p
     JOIN schools s ON s.id = p.school_id
     LEFT JOIN program_courses pc ON pc.program_id = p.id
     LEFT JOIN courses mc ON mc.id = p.main_course_id
     GROUP BY p.id, s.name, s.slug, mc.title, mc.slug, mc.thumbnail
     ORDER BY s.sort_order ASC, p.sort_order ASC`
  );
  return rows;
}

// ── Program Courses ──

export async function getProgramCourses(programId: string): Promise<any[]> {
  const { rows } = await query(
    `SELECT c.*, pc.order_index,
            u.name as instructor_name,
            u.avatar as instructor_avatar,
            COALESCE(COUNT(DISTINCT e.id)::int, 0) as student_count,
            COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)::float as avg_rating
     FROM program_courses pc
     JOIN courses c ON c.id = pc.course_id
     JOIN users u ON c.instructor_id = u.id
     LEFT JOIN enrollments e ON e.course_id = c.id
     LEFT JOIN reviews r ON r.course_id = c.id
     WHERE pc.program_id = $1 AND c.published = true
     GROUP BY c.id, u.name, u.avatar, pc.order_index
     ORDER BY pc.order_index ASC`,
    [programId]
  );
  return rows;
}
