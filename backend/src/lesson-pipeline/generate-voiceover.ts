import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import fs from 'fs';
import { query } from '../config/db';
import { LessonScript, lessonDir, slugify, MIN_SCENE_SECONDS } from './types';
import { parseArgs, readJson, ensureDir, probeDuration } from './utils';
import { ensureVoiceover, hasEdgeTts } from './voiceover';

async function main(opts: { lesson?: string; course?: string }) {
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
    `SELECT l.id, l.title, c.slug AS course_slug FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = $1`,
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

  const audioDir = path.join(dir, 'audio');
  ensureDir(audioDir);

  console.log(`Voiceover for "${lesson.title}" (${script.scenes.length} scenes):`);
  const engine = await hasEdgeTts();
  console.log(`  TTS engine: ${engine ? 'edge-tts (free, no key)' : 'Windows SAPI fallback (pip install edge-tts for natural voices)'}`);

  for (const scene of script.scenes) {
    const idx = parseInt(scene.id.replace(/\D/g, ''), 10) || 1;
    const mp3 = path.join(audioDir, `scene_${String(idx).padStart(2, '0')}.mp3`);
    if (fs.existsSync(mp3)) {
      process.stdout.write(`  [${scene.id}] cached\n`);
      continue;
    }
    process.stdout.write(`  [${scene.id}] "${scene.narration.substring(0, 50)}..." `);
    await ensureVoiceover(script, dir); // idempotent; synthesizes missing
    process.stdout.write(`✓ ${(await probeDuration(mp3) || 0).toFixed(1)}s\n`);
  }

  const voices = await ensureVoiceover(script, dir);
  const total = voices.reduce((s, v) => s + v.duration, 0);
  console.log(`\nDone: ${voices.length} files, ${(total / 60).toFixed(1)} min narration; video ~${Math.max(voices.length * MIN_SCENE_SECONDS, Math.ceil(total + voices.length))}s.`);
  process.exit(0);
}

main(parseArgs(process.argv.slice(2)) as any).catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});