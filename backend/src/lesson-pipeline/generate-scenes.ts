import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { query } from '../config/db';
import { LessonScript, lessonDir, slugify } from './types';
import { parseArgs, readJson, probeDuration } from './utils';
import { renderScenes } from './scenes';

export async function main(opts: { lesson?: string; course?: string }) {
  let targetId = opts.lesson;
  if (!targetId) {
    const { rows } = await query(
      `SELECT l.id FROM lessons l JOIN courses c ON c.id = l.course_id
        WHERE c.slug = $1 AND l.script IS NULL ORDER BY l.order_index LIMIT 1`,
      [opts.course]
    );
    targetId = rows[0]?.id;
  }
  if (!targetId) {
    console.error('Provide --lesson <id> or --course <slug>');
    process.exit(1);
  }

  const { rows } = await query(
    `SELECT l.id, l.title, c.slug AS course_slug, c.title AS course_title
       FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = $1`,
    [targetId]
  );
  const lesson = rows[0];
  if (!lesson) {
    console.error(`Lesson not found: ${targetId}`);
    process.exit(1);
  }

  const dir = path.join(process.cwd(), lessonDir(lesson.course_slug, slugify(lesson.title)));
  const script = readJson<LessonScript>(path.join(dir, 'script.json'));
  if (!script?.scenes?.length) {
    console.error(`No script.json for "${lesson.title}". Run lesson:script first.`);
    process.exit(1);
  }

  // Prefer measured audio durations when available; otherwise estimate.
  const durations: number[] = [];
  for (const scene of script.scenes) {
    const idx = parseInt(scene.id.replace(/\D/g, ''), 10) || 1;
    const audio = path.join(dir, 'audio', `scene_${String(idx).padStart(2, '0')}.mp3`);
    const d = await probeDuration(audio);
    durations.push(d || 8);
  }

  console.log(`Rendering scenes for "${lesson.title}" (${script.scenes.length} scenes)...`);
  const files = await renderScenes({
    courseTitle: lesson.course_title,
    lessonTitle: lesson.title,
    scenes: script.scenes,
    durations,
    cwd: dir,
  });
  console.log(`\nRendered ${files.length} scenes under ${path.join(dir, 'scenes')}.`);
  process.exit(0);
}

main(parseArgs(process.argv.slice(2)) as any).catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});