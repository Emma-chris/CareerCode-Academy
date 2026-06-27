import { query } from '../config/db';

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  level: string;
  slug: string;
  created_at: Date;
  updated_at: Date;
}

function pathSlug(category: string, level: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + level;
}

function pathTitle(category: string, level: string): string {
  const lvl = level.charAt(0).toUpperCase() + level.slice(1);
  return `${category} for ${lvl}`;
}

const levelColors: Record<string, string> = {
  beginner: 'from-emerald-500 to-teal-600',
  intermediate: 'from-blue-500 to-indigo-600',
  advanced: 'from-purple-500 to-pink-600',
};

const levelIcons: Record<string, string> = {
  beginner: 'BookOpen',
  intermediate: 'BarChart',
  advanced: 'Rocket',
};

async function upsertPath(category: string, level: string): Promise<string> {
  const slug = pathSlug(category, level);
  const title = pathTitle(category, level);
  const icon = levelIcons[level] || 'GitBranch';
  const color = levelColors[level] || 'from-blue-600 to-cyan-600';

  const existing = await query('SELECT id FROM learning_paths WHERE slug = $1', [slug]);
  if (existing.rows.length > 0) {
    await query(
      `UPDATE learning_paths SET title = $1, icon = $2, color = $3, level = $4, updated_at = NOW() WHERE slug = $5`,
      [title, icon, color, level, slug]
    );
    return existing.rows[0].id;
  }

  const { rows } = await query(
    `INSERT INTO learning_paths (title, description, icon, color, level, slug)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [title, `${category} path for ${level} learners`, icon, color, level, slug]
  );
  return rows[0].id;
}

async function rebuildPathCourses(pathId: string, category: string, level: string): Promise<void> {
  const { rows } = await query(
    `SELECT id FROM courses WHERE category = $1 AND level = $2 AND published = true ORDER BY created_at ASC`,
    [category, level]
  );

  await query('DELETE FROM learning_path_courses WHERE path_id = $1', [pathId]);

  for (let i = 0; i < rows.length; i++) {
    await query(
      `INSERT INTO learning_path_courses (path_id, course_id, order_index) VALUES ($1, $2, $3)`,
      [pathId, rows[i].id, i]
    );
  }
}

async function removeOrphanedPaths(): Promise<void> {
  await query(
    `DELETE FROM learning_paths lp WHERE NOT EXISTS (
      SELECT 1 FROM learning_path_courses lpc WHERE lpc.path_id = lp.id
    )`
  );
}

export async function syncLearningPathForCourse(
  course: { id: string; category: string; level: string },
  oldCategory?: string,
  oldLevel?: string
): Promise<void> {
  const groups = new Set<string>();

  groups.add(`${course.category}::${course.level}`);

  if (oldCategory && oldLevel && (oldCategory !== course.category || oldLevel !== course.level)) {
    groups.add(`${oldCategory}::${oldLevel}`);
  }

  for (const g of groups) {
    const [cat, lvl] = g.split('::');
    const pathId = await upsertPath(cat, lvl);
    await rebuildPathCourses(pathId, cat, lvl);
  }

  await removeOrphanedPaths();
}

export async function syncAllLearningPaths(): Promise<void> {
  const { rows } = await query(
    `SELECT DISTINCT category, level FROM courses WHERE published = true`
  );

  for (const row of rows) {
    const pathId = await upsertPath(row.category, row.level);
    await rebuildPathCourses(pathId, row.category, row.level);
  }

  await removeOrphanedPaths();
}

export async function getAllLearningPaths(): Promise<any[]> {
  const { rows } = await query(
    `SELECT lp.*,
       COUNT(lpc.course_id)::int as courses_count,
       COALESCE(SUM(c.duration), 0)::int as total_duration,
       (SELECT COUNT(DISTINCT e.user_id)
        FROM enrollments e
        JOIN learning_path_courses lpc2 ON e.course_id = lpc2.course_id
        WHERE lpc2.path_id = lp.id) as students_count
     FROM learning_paths lp
     LEFT JOIN learning_path_courses lpc ON lp.id = lpc.path_id
     LEFT JOIN courses c ON lpc.course_id = c.id
     GROUP BY lp.id
     ORDER BY lp.title ASC
    `
  );
  return rows;
}

export async function getLearningPathBySlug(slug: string): Promise<any | null> {
  const { rows } = await query(
    `SELECT lp.*,
       COUNT(lpc.course_id)::int as courses_count,
       COALESCE(SUM(c.duration), 0)::int as total_duration,
       (SELECT COUNT(DISTINCT e.user_id)
        FROM enrollments e
        JOIN learning_path_courses lpc2 ON e.course_id = lpc2.course_id
        WHERE lpc2.path_id = lp.id) as students_count
     FROM learning_paths lp
     LEFT JOIN learning_path_courses lpc ON lp.id = lpc.path_id
     LEFT JOIN courses c ON lpc.course_id = c.id
     WHERE lp.slug = $1
     GROUP BY lp.id`,
    [slug]
  );
  return rows[0] || null;
}
