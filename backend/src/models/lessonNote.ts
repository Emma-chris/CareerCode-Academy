import { query } from '../config/db';

export async function getNote(userId: string, lessonId: string): Promise<string> {
  const { rows } = await query<{ content: string }>(
    'SELECT content FROM lesson_notes WHERE user_id = $1 AND lesson_id = $2',
    [userId, lessonId]
  );
  return rows[0]?.content || '';
}

export async function upsertNote(userId: string, lessonId: string, content: string): Promise<void> {
  await query(
    `INSERT INTO lesson_notes (user_id, lesson_id, content, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_id, lesson_id)
     DO UPDATE SET content = $3, updated_at = NOW()`,
    [userId, lessonId, content]
  );
}
