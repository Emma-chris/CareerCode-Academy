import { query } from '../config/db';

export interface CareerGoalBundleItem {
  courseSlug: string;
  phase: string;
}

export interface CareerGoalSpec {
  slug: string;
  title: string;
  roleTitle: string;
  summary?: string;
  icon?: string;
  color?: string;
  desiredSkills?: string[];
  salaryBand?: string;
  durationEstimate?: string;
  schoolSlug?: string;
  sortOrder?: number;
  bundle: CareerGoalBundleItem[];
}

// ────────────────────────────── helpers ──────────────────────────────

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function resolveCourseId(courseSlug: string): Promise<string | null> {
  const slug = slugify(courseSlug);
  const { rows } = await query(
    `SELECT id FROM courses
     WHERE slug = $1
        OR lower(regexp_replace(title, '[^a-z0-9]+', '-', 'g')) = $1
     LIMIT 1`,
    [slug]
  );
  return rows[0]?.id || null;
}

// ────────────────────────────── reads ──────────────────────────────

export async function getAllCareerGoals(): Promise<any[]> {
  const { rows } = await query(
    `SELECT g.*,
       COUNT(gc.course_id)::int as courses_count,
       COALESCE(SUM(c.duration), 0)::int as total_duration,
       (SELECT COUNT(DISTINCT e.user_id)::int
        FROM learning_path_courses lpc
        JOIN enrollments e ON e.course_id = lpc.course_id
        WHERE lpc.path_id = lp.id) as students_count,
       s.name as school_name, s.slug as school_slug, s.icon as school_icon, s.color as school_color,
       lp.id as path_id, lp.slug as path_slug, lp.color as path_color
     FROM career_goals g
     LEFT JOIN career_goal_courses gc ON gc.goal_id = g.id
     LEFT JOIN courses c ON c.id = gc.course_id
     LEFT JOIN schools s ON s.id = g.school_id
     LEFT JOIN learning_paths lp ON lp.career_goal_id = g.id
     WHERE g.is_active = true
     GROUP BY g.id, s.name, s.slug, s.icon, s.color, lp.id, lp.slug, lp.color
     ORDER BY g.sort_order ASC, g.title ASC
    `
  );
  return rows;
}

export async function getCareerGoalCourses(goalId: string): Promise<any[]> {
  const { rows } = await query(
    `SELECT c.id, c.title, c.slug, c.thumbnail, c.duration, c.level, c.price, c.category,
            gc.order_index, gc.phase,
            u.name as instructor_name
     FROM career_goal_courses gc
     JOIN courses c ON gc.course_id = c.id
     JOIN users u ON c.instructor_id = u.id
     WHERE gc.goal_id = $1
     ORDER BY gc.order_index ASC`,
    [goalId]
  );
  return rows;
}

export async function getCareerGoalBySlug(slug: string): Promise<any | null> {
  const { rows } = await query(
    `SELECT g.*,
       (SELECT COUNT(*)::int FROM career_goal_courses gc2 WHERE gc2.goal_id = g.id) as courses_count,
       (SELECT COALESCE(SUM(c2.duration), 0)::int FROM career_goal_courses gc2 JOIN courses c2 ON c2.id = gc2.course_id WHERE gc2.goal_id = g.id) as total_duration,
       (SELECT COUNT(DISTINCT e.user_id)::int
        FROM learning_path_courses lpc
        JOIN enrollments e ON e.course_id = lpc.course_id
        WHERE lpc.path_id = lp.id) as students_count,
       s.name as school_name, s.slug as school_slug, s.icon as school_icon, s.color as school_color,
       lp.id as path_id, lp.slug as path_slug, lp.title as path_title, lp.color as path_color, lp.level as path_level
     FROM career_goals g
     LEFT JOIN schools s ON s.id = g.school_id
     LEFT JOIN learning_paths lp ON lp.career_goal_id = g.id
     WHERE g.slug = $1`,
    [slug]
  );
  return rows[0] || null;
}

// User's pursued goals (goals whose linked path the user has enrolled in), with progress.
export async function getMyCareerGoals(userId: string): Promise<any[]> {
  const { rows } = await query(
    `SELECT g.id, g.title, g.slug, g.role_title, g.icon, g.color, g.desired_skills,
            g.salary_band, g.duration_estimate,
            s.name as school_name, s.slug as school_slug,
            lp.slug as path_slug,
            lpe.progress, lpe.completed, lpe.started_at,
            (SELECT COUNT(*)::int FROM learning_path_courses WHERE path_id = lp.id) as total_courses,
            (SELECT COUNT(*)::int
             FROM learning_path_courses lpc
             JOIN enrollments e ON e.course_id = lpc.course_id AND e.user_id = $1 AND e.completed = true
             WHERE lpc.path_id = lp.id) as completed_courses
     FROM career_goals g
     JOIN learning_paths lp ON lp.career_goal_id = g.id
     JOIN learning_path_enrollments lpe ON lpe.path_id = lp.id AND lpe.user_id = $1
     LEFT JOIN schools s ON s.id = g.school_id
     WHERE g.is_active = true
     ORDER BY lpe.started_at DESC`,
    [userId]
  );
  return rows;
}

// ────────────────────────────── writes (seeding / sync) ──────────────────────────────

export async function upsertCareerGoal(spec: CareerGoalSpec): Promise<string> {
  let schoolId: string | null = null;
  if (spec.schoolSlug) {
    const { rows } = await query('SELECT id FROM schools WHERE slug = $1', [spec.schoolSlug]);
    schoolId = rows[0]?.id || null;
  }

  const { rows: existing } = await query('SELECT id FROM career_goals WHERE slug = $1', [spec.slug]);
  if (existing.length > 0) {
    const id = existing[0].id;
    await query(
      `UPDATE career_goals SET
         title = $1, role_title = $2, summary = $3, icon = $4, color = $5,
         desired_skills = $6, salary_band = $7, duration_estimate = $8,
         school_id = $9, sort_order = $10, updated_at = NOW()
       WHERE id = $11`,
      [
        spec.title, spec.roleTitle, spec.summary || null, spec.icon || 'Target',
        spec.color || 'from-blue-600 to-cyan-600', spec.desiredSkills || [],
        spec.salaryBand || null, spec.durationEstimate || null,
        schoolId, spec.sortOrder ?? 0, id,
      ]
    );
    return id;
  }

  const { rows } = await query(
    `INSERT INTO career_goals (title, slug, role_title, summary, icon, color, desired_skills, salary_band, duration_estimate, school_id, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      spec.title, spec.slug, spec.roleTitle, spec.summary || null, spec.icon || 'Target',
      spec.color || 'from-blue-600 to-cyan-600', spec.desiredSkills || [],
      spec.salaryBand || null, spec.durationEstimate || null,
      schoolId, spec.sortOrder ?? 0,
    ]
  );
  return rows[0].id;
}

export async function setCareerGoalCourses(goalId: string, bundle: CareerGoalBundleItem[]): Promise<void> {
  const resolved: { courseId: string; phase: string }[] = [];
  const missing: string[] = [];

  for (const item of bundle) {
    const courseId = await resolveCourseId(item.courseSlug);
    if (courseId) {
      resolved.push({ courseId, phase: item.phase });
    } else {
      missing.push(item.courseSlug);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Career goal bundle references unknown courses: ${missing.join(', ')}`);
  }

  await query('DELETE FROM career_goal_courses WHERE goal_id = $1', [goalId]);
  for (let i = 0; i < resolved.length; i++) {
    await query(
      `INSERT INTO career_goal_courses (goal_id, course_id, order_index, phase) VALUES ($1, $2, $3, $4)`,
      [goalId, resolved[i].courseId, i, resolved[i].phase]
    );
  }
}

// Syncs a goal's curated bundle to a learning_path so enrollment/progress/XP/guided-mode reuse
// the existing machinery. The linked path slug is `career-goal-<goal-slug>`.
export async function syncCareerGoalPath(goalId: string): Promise<string | null> {
  const { rows: goalRows } = await query(
    `SELECT g.id, g.slug, g.title, g.summary, g.icon, g.color, g.school_id
     FROM career_goals g WHERE g.id = $1`,
    [goalId]
  );
  const goal = goalRows[0];
  if (!goal) return null;

  const { rows: courseRows } = await query(
    'SELECT course_id FROM career_goal_courses WHERE goal_id = $1 ORDER BY order_index ASC',
    [goalId]
  );
  if (courseRows.length === 0) return null;

  const slug = `career-goal-${goal.slug}`;
  const existing = await query('SELECT id FROM learning_paths WHERE slug = $1', [slug]);
  let pathId: string;
  if (existing.rows.length > 0) {
    pathId = existing.rows[0].id;
    await query(
      `UPDATE learning_paths SET
         title = $1, description = $2, icon = $3, color = $4,
         level = $5, school_id = $6, career_goal_id = $7, updated_at = NOW()
       WHERE id = $8`,
      [goal.title, goal.summary || `${goal.title} — structured pathway`, goal.icon || 'Target', goal.color || 'from-blue-600 to-cyan-600', 'beginner', goal.school_id, goal.id, pathId]
    );
  } else {
    const { rows } = await query(
      `INSERT INTO learning_paths (title, description, icon, color, level, slug, school_id, career_goal_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [goal.title, goal.summary || `${goal.title} — structured pathway`, goal.icon || 'Target', goal.color || 'from-blue-600 to-cyan-600', 'beginner', slug, goal.school_id, goal.id]
    );
    pathId = rows[0].id;
  }

  await query('DELETE FROM learning_path_courses WHERE path_id = $1', [pathId]);
  for (let i = 0; i < courseRows.length; i++) {
    await query(
      `INSERT INTO learning_path_courses (path_id, course_id, order_index) VALUES ($1, $2, $3)`,
      [pathId, courseRows[i].course_id, i]
    );
  }

  return pathId;
}