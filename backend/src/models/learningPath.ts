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

function schoolPathSlug(schoolSlug: string, level: string): string {
  return `${schoolSlug}-${level}`;
}

function schoolPathTitle(schoolName: string, level: string): string {
  const lvl = level.charAt(0).toUpperCase() + level.slice(1);
  return `${schoolName} — ${lvl}`;
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

async function upsertSchoolPath(schoolId: string, schoolSlug: string, schoolName: string, level: string): Promise<string> {
  const slug = schoolPathSlug(schoolSlug, level);
  const title = schoolPathTitle(schoolName, level);
  const icon = (levelIcons as any)[level] || 'GitBranch';
  const color = (levelColors as any)[level] || 'from-blue-600 to-cyan-600';
  const existing = await query('SELECT id FROM learning_paths WHERE slug = $1', [slug]);
  if (existing.rows.length > 0) {
    await query(
      `UPDATE learning_paths SET title = $1, icon = $2, color = $3, level = $4, school_id = $5, updated_at = NOW() WHERE slug = $6`,
      [title, icon, color, level, schoolId, slug]
    );
    return existing.rows[0].id;
  }
  const { rows } = await query(
    `INSERT INTO learning_paths (title, description, icon, color, level, slug, school_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [title, `${schoolName} pathway — ${level} level`, icon, color, level, slug, schoolId]
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

async function rebuildSchoolPathCourses(pathId: string, schoolId: string, level: string): Promise<void> {
  const { rows } = await query(
    `SELECT DISTINCT c.id FROM courses c
     LEFT JOIN programs pr ON pr.id = c.program_id
     LEFT JOIN program_courses pc ON pc.course_id = c.id
     LEFT JOIN programs pr2 ON pr2.id = pc.program_id
     WHERE c.published = true AND c.level = $2
       AND (pr.school_id = $1 OR pr2.school_id = $1)
     ORDER BY c.created_at ASC`,
    [schoolId, level]
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
  course: { id: string; category: string; level: string; program_id?: string | null },
  oldCategory?: string,
  oldLevel?: string,
  oldProgramId?: string | null
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

  // Also sync school-based pathways if course has program
  const programIds = new Set<string>();
  if (course.program_id) programIds.add(course.program_id);
  if (oldProgramId && oldProgramId !== course.program_id) programIds.add(oldProgramId);
  for (const pid of programIds) {
    try {
      const { rows } = await query(`SELECT school_id, slug, name FROM programs JOIN schools ON programs.school_id = schools.id WHERE programs.id = $1`, [pid]);
      if (rows[0]) {
        const s = rows[0];
        const pathId = await upsertSchoolPath(s.school_id, s.slug, s.name, course.level);
        await rebuildSchoolPathCourses(pathId, s.school_id, course.level);
        if (oldLevel && oldLevel !== course.level) {
          const oldPathId = await upsertSchoolPath(s.school_id, s.slug, s.name, oldLevel);
          await rebuildSchoolPathCourses(oldPathId, s.school_id, oldLevel);
        }
      }
    } catch {}
  }
  // If course has no program but old had, clean old school paths
  if (!course.program_id && oldProgramId) {
    try {
      const { rows } = await query(`SELECT school_id, slug, name FROM programs JOIN schools ON programs.school_id = schools.id WHERE programs.id = $1`, [oldProgramId]);
      if (rows[0]) {
        const s = rows[0];
        const pathId = await upsertSchoolPath(s.school_id, s.slug, s.name, course.level);
        await rebuildSchoolPathCourses(pathId, s.school_id, course.level);
      }
    } catch {}
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

export async function syncAllSchoolPaths(): Promise<void> {
  const { rows: schools } = await query(`SELECT id, slug, name FROM schools ORDER BY sort_order ASC`);
  const levels = ['beginner', 'intermediate', 'advanced'];
  for (const s of schools) {
    for (const level of levels) {
      const pathId = await upsertSchoolPath(s.id, s.slug, s.name, level);
      await rebuildSchoolPathCourses(pathId, s.id, level);
    }
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

export async function getGroupedByCategory(): Promise<any[]> {
  const { rows: cats } = await query(
    `SELECT DISTINCT category FROM courses WHERE published = true ORDER BY category ASC`
  );
  const levels = ['beginner', 'intermediate', 'advanced'];
  const result: any[] = [];
  for (const r of cats) {
    const category: string = r.category;
    const zones: Record<string, any> = {};
    let hasAny = false;
    for (const level of levels) {
      const slug = pathSlug(category, level);
      const { rows: pathRows } = await query(`SELECT * FROM learning_paths WHERE slug = $1`, [slug]);
      const path = pathRows[0] || null;
      const { rows: courseRows } = await query(
        `SELECT c.id, c.title, c.slug, c.thumbnail, c.duration, c.level, c.price,
                u.name as instructor_name
         FROM learning_path_courses lpc
         JOIN courses c ON lpc.course_id = c.id
         JOIN users u ON c.instructor_id = u.id
         WHERE lpc.path_id = $1
         ORDER BY lpc.order_index ASC`,
        [path?.id || '00000000-0000-0000-0000-000000000000']
      );
      // If path doesn't exist, courseRows will be empty; treat as empty zone -> hide
      const countRes = await query(
        `SELECT COUNT(*)::int as cnt, COALESCE(SUM(duration),0)::int as dur
         FROM courses WHERE category=$1 AND level=$2 AND published=true`, [category, level]
      );
      const cnt = Number(countRes.rows[0]?.cnt) || 0;
      if (cnt > 0 && path) {
        const { rows: statsRows } = await query(
          `SELECT COUNT(DISTINCT e.user_id)::int as students
           FROM enrollments e
           JOIN learning_path_courses lpc2 ON e.course_id = lpc2.course_id
           WHERE lpc2.path_id=$1`, [path.id]
        );
        zones[level] = {
          path,
          courses: courseRows,
          courses_count: cnt,
          total_duration: Number(countRes.rows[0]?.dur) || 0,
          students_count: Number((statsRows[0] as any)?.students) || 0,
          color: path.color,
          icon: path.icon,
        };
        hasAny = true;
      } else {
        zones[level] = null; // hide empty zone
      }
    }
    if (hasAny) {
      result.push({
        category,
        categorySlug: category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        zones
      });
    }
  }
  return result;
}

export async function getGroupedBySchool(): Promise<any[]> {
  const { rows: schools } = await query(`SELECT s.*, COUNT(p.id)::int as program_count FROM schools s LEFT JOIN programs p ON p.school_id = s.id GROUP BY s.id ORDER BY s.sort_order ASC`);
  const levels: ('beginner'|'intermediate'|'advanced')[] = ['beginner', 'intermediate', 'advanced'];
  const result: any[] = [];
  for (const school of schools) {
    const zones: Record<string, any> = {};
    let hasAny = false;
    let totalSchoolCourses = 0;
    for (const level of levels) {
      const slug = schoolPathSlug(school.slug, level);
      let { rows: pathRows } = await query(`SELECT * FROM learning_paths WHERE slug = $1`, [slug]);
      let path = pathRows[0] || null;
      const countRes = await query(
        `SELECT COUNT(DISTINCT c.id)::int as cnt, COALESCE(SUM(c.duration),0)::int as dur
         FROM courses c
         LEFT JOIN programs pr ON pr.id = c.program_id
         LEFT JOIN program_courses pc ON pc.course_id = c.id
         LEFT JOIN programs pr2 ON pr2.id = pc.program_id
         WHERE c.published = true AND c.level = $2
           AND (pr.school_id = $1 OR pr2.school_id = $1)`, [school.id, level]
      );
      const cnt = Number(countRes.rows[0]?.cnt) || 0;
      totalSchoolCourses += cnt;
      if (cnt > 0 && !path) {
        try {
          const newId = await upsertSchoolPath(school.id, school.slug, school.name, level);
          await rebuildSchoolPathCourses(newId, school.id, level);
          const { rows: newRows } = await query(`SELECT * FROM learning_paths WHERE slug = $1`, [slug]);
          path = newRows[0] || null;
        } catch {}
      }
      if (cnt > 0 && path) {
        const { rows: courseRows } = await query(
          `SELECT c.id, c.title, c.slug, c.thumbnail, c.duration, c.level, c.price, c.category,
                  u.name as instructor_name
           FROM learning_path_courses lpc
           JOIN courses c ON lpc.course_id = c.id
           JOIN users u ON c.instructor_id = u.id
           WHERE lpc.path_id = $1
           ORDER BY lpc.order_index ASC`,
          [path.id]
        );
        const { rows: statsRows } = await query(
          `SELECT COUNT(DISTINCT e.user_id)::int as students
           FROM enrollments e
           JOIN learning_path_courses lpc2 ON e.course_id = lpc2.course_id
           WHERE lpc2.path_id=$1`, [path.id]
        );
        zones[level] = {
          path,
          courses: courseRows,
          courses_count: cnt,
          total_duration: Number(countRes.rows[0]?.dur) || 0,
          students_count: Number((statsRows[0] as any)?.students) || 0,
          color: path.color,
          icon: path.icon,
        };
        hasAny = true;
      } else {
        zones[level] = null;
      }
    }
    // Include school even if no courses yet? For now hide completely empty schools? Spec says hide empty zones, not schools. Keep school if hasAny else skip.
    if (hasAny) {
      result.push({
        school: {
          id: school.id,
          name: school.name,
          slug: school.slug,
          description: school.description,
          icon: school.icon,
          color: school.color,
          sort_order: school.sort_order,
          program_count: Number(school.program_count) || 0,
        },
        category: school.name,
        categorySlug: school.slug,
        totalCourses: totalSchoolCourses,
        zones
      });
    } else {
      // Still push school with empty zones so UI can show "No courses yet" with school header? But spec says hide empty zones, not schools. We hide fully empty schools to avoid "No learning paths"
      // If you want to show all schools even empty, uncomment:
      // result.push({ school: {...}, totalCourses: 0, zones });
    }
  }
  return result;
}
