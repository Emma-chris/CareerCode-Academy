import { query } from '../config/db';

export interface Promotion {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  discount_percent: number;
  scope: 'all' | 'category' | 'course';
  category_id: string | null;
  course_id: string | null;
  starts_at: Date;
  ends_at: Date;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PromotionWithMeta extends Promotion {
  category_name?: string | null;
  course_title?: string | null;
}

export interface CreatePromotionInput {
  title: string;
  description?: string;
  slug?: string;
  discount_percent: number;
  scope: 'all' | 'category' | 'course';
  category_id?: string | null;
  course_id?: string | null;
  starts_at: Date;
  ends_at: Date;
  is_active?: boolean;
  created_by?: string | null;
}

export interface UpdatePromotionInput {
  title?: string;
  description?: string;
  slug?: string;
  discount_percent?: number;
  scope?: 'all' | 'category' | 'course';
  category_id?: string | null;
  course_id?: string | null;
  starts_at?: Date;
  ends_at?: Date;
  is_active?: boolean;
}

const SELECT_META = `
  SELECT p.*,
    c.name as category_name,
    co.title as course_title
  FROM promotions p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN courses co ON p.course_id = co.id
`;

export async function listPromotions(): Promise<PromotionWithMeta[]> {
  const { rows } = await query<PromotionWithMeta>(`${SELECT_META} ORDER BY p.created_at DESC`);
  return rows;
}

export async function getActivePromotions(): Promise<PromotionWithMeta[]> {
  const { rows } = await query<PromotionWithMeta>(
    `${SELECT_META}
     WHERE p.is_active = true AND p.starts_at <= NOW() AND p.ends_at > NOW()
     ORDER BY p.ends_at ASC`
  );
  return rows;
}

export async function getPromotionById(id: string): Promise<PromotionWithMeta | null> {
  const { rows } = await query<PromotionWithMeta>(`${SELECT_META} WHERE p.id = $1`, [id]);
  return rows[0] || null;
}

export async function getPromotionBySlug(slug: string): Promise<PromotionWithMeta | null> {
  const { rows } = await query<PromotionWithMeta>(`${SELECT_META} WHERE p.slug = $1`, [slug]);
  return rows[0] || null;
}

/**
 * Resolve the single strongest active promotion applicable to a course.
 * Priority: course-scoped > category-scoped > platform-wide. Returns null when
 * no active promotion applies (course is sold at full price).
 * `categoryName` is the course's category field (courses store category by name).
 */
export async function getActivePromotionForCourse(courseId: string, categoryName?: string | null): Promise<Promotion | null> {
  const { rows } = await query<Promotion>(
    `SELECT p.*
     FROM promotions p
     LEFT JOIN categories cat ON cat.id = p.category_id
     WHERE p.is_active = true
       AND p.starts_at <= NOW()
       AND p.ends_at > NOW()
       AND (
         (p.scope = 'course' AND p.course_id = $1)
         OR (p.scope = 'category' AND cat.name = $2)
         OR (p.scope = 'all')
       )
     ORDER BY
       CASE WHEN p.scope = 'course' THEN 0 WHEN p.scope = 'category' THEN 1 ELSE 2 END,
       p.discount_percent DESC,
       p.ends_at ASC
     LIMIT 1`,
    [courseId, categoryName || null]
  );
  return rows[0] || null;
}

/** Attach the active promotion + effective price to a single course row. */
export async function decorateCourse<C extends Record<string, any>>(course: C): Promise<C & { promotion: Promotion | null; effective_price: number }> {
  const promo = await getActivePromotionForCourse(course.id, course.category ?? null);
  const percent = promo ? Number(promo.discount_percent) : 0;
  const price = Number(course.price) || 0;
  return {
    ...course,
    promotion: promo,
    effective_price: price * (1 - percent / 100),
  };
}

/** Attach the active promotion + effective price to courses list. */
export async function decorateCourses<C extends Record<string, any>>(courses: C[]): Promise<Array<C & { promotion: Promotion | null; effective_price: number }>> {
  return Promise.all(courses.map((c) => decorateCourse(c)));
}

export async function createPromotion(input: CreatePromotionInput): Promise<Promotion> {
  const { rows } = await query<Promotion>(
    `INSERT INTO promotions (title, description, slug, discount_percent, scope, category_id, course_id, starts_at, ends_at, is_active, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      input.title,
      input.description || null,
      input.slug || null,
      input.discount_percent,
      input.scope,
      input.category_id || null,
      input.course_id || null,
      input.starts_at,
      input.ends_at,
      input.is_active ?? true,
      input.created_by || null,
    ]
  );
  return rows[0];
}

export async function updatePromotion(id: string, input: UpdatePromotionInput): Promise<Promotion | null> {
  const allowed: (keyof UpdatePromotionInput)[] = [
    'title', 'description', 'slug', 'discount_percent', 'scope', 'category_id', 'course_id', 'starts_at', 'ends_at', 'is_active',
  ];
  const sets: string[] = [];
  const values: unknown[] = [];
  allowed.forEach((key) => {
    if (key in input && input[key] !== undefined) {
      values.push(input[key] === null ? null : input[key]);
      sets.push(`${key} = $${values.length}`);
    }
  });
  if (!sets.length) return getPromotionById(id);
  sets.push(`updated_at = NOW()`);
  values.push(id);
  const { rows } = await query<Promotion>(
    `UPDATE promotions SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

export async function deletePromotion(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM promotions WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export interface PromotionSummary {
  totalActive: number;
  platformWide: number;
  scheduled: number;
  finished: number;
  totalDiscountGranted: number;
}

export async function getPromotionSummary(): Promise<PromotionSummary> {
  const { rows } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE is_active = true AND starts_at <= NOW() AND ends_at > NOW())::int as total_active,
       COUNT(*) FILTER (WHERE is_active = true AND scope = 'all' AND starts_at <= NOW() AND ends_at > NOW())::int as platform_wide,
       COUNT(*) FILTER (WHERE is_active = true AND starts_at > NOW())::int as scheduled,
       COUNT(*) FILTER (WHERE ends_at <= NOW())::int as finished,
       COALESCE(SUM(promo_discount_amount) FILTER (WHERE status = 'completed'), 0)::float as total_discount_granted
     FROM promotions p
     LEFT JOIN payments pay ON pay.promotion_id = p.id`
  );
  return rows[0];
}