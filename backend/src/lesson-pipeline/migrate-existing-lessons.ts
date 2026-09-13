import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { query } from '../config/db';
import { parseArgs, execAsync } from './utils';

interface Options {
  course?: string;
  limit?: number;
  resume?: boolean;
  force?: boolean;
}

interface Progress {
  done: string[];
  failed: string[];
  startedAt: string;
  updatedAt: string;
}

const PROGRESS_FILE = path.join(process.cwd(), 'lesson_migration_progress.json');
const TRANSPILER = path.join(process.cwd(), 'node_modules', '.bin', 'tsx');

function loadProgress(): Progress {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch {
    return { done: [], failed: [], startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
}

function saveProgress(p: Progress) {
  p.updatedAt = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

async function runStage(script: string, args: string[], timeoutMs: number): Promise<void> {
  const cmd = `"${TRANSPILER}" --require dotenv/config ${script} ${args.join(' ')}`;
  const { stdout } = await execAsync(cmd, { cwd: process.cwd(), maxBuffer: 64 * 1024 * 1024, timeout: timeoutMs, shell: 'cmd.exe' });
  process.stdout.write(stdout);
}

async function migrateExisting(opts: Options) {
  console.log('=== CareerCode Academy — Lesson Migration (original videos) ===\n');

  let sql = `
    SELECT l.id, l.title, c.slug AS course_slug, c.title AS course_title
      FROM lessons l JOIN courses c ON c.id = l.course_id
     WHERE l.script IS NULL
  `;
  const params: any[] = [];
  if (opts.course) {
    params.push(opts.course);
    sql += ` AND c.slug = $${params.length}`;
  }
  if (opts.limit) {
    params.push(opts.limit);
    sql += ` ORDER BY l.order_index LIMIT $${params.length}`;
  } else {
    sql += ` ORDER BY c.title, l.order_index`;
  }
  const { rows } = await query(sql, params);
  console.log(`Found ${rows.length} lessons without a script${opts.course ? ` (course: ${opts.course})` : ''}.\n`);

  const progress = opts.resume ? loadProgress() : { done: [] as string[], failed: [] as string[], startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const skip = new Set(progress.done);
  const todo = rows.filter((r: any) => !skip.has(r.id));
  console.log(`Skipping ${rows.length - todo.length} already-done lessons.`);

  let ok = 0;
  let err = 0;
  for (const lesson of todo) {
    console.log(`\n────────────────────────────────────────────`);
    console.log(`[${lesson.title}] (${lesson.id})`);
    try {
      await runStage('src/lesson-pipeline/fetch-reference.ts', [`--lesson`, lesson.id], 120000);
    } catch (e: any) {
      console.warn(`  reference fetch failed (non-fatal): ${(e.message || '').substring(0, 120)}`);
    }

    try {
      await runStage('src/lesson-pipeline/generate-script.ts', ['--lesson', lesson.id, '--auto'], 300000);
    } catch (e: any) {
      console.warn(`  script generation failed (non-fatal): ${(e.message || '').substring(0, 120)}`);
    }

    try {
      await runStage(
        'src/lesson-pipeline/render-lesson-video.ts',
        ['--lesson', lesson.id].concat(opts.force ? ['--force'] : []),
        1800000
      );
      progress.done.push(lesson.id);
      saveProgress(progress);
      ok++;
      console.log(`✓ DONE`);
    } catch (e: any) {
      err++;
      progress.failed.push(lesson.id);
      saveProgress(progress);
      console.error(`✗ ${(e.message || '').substring(0, 200)}`);
    }
  }

  console.log(`\n=== MIGRATION COMPLETE ===`);
  console.log(`  Rendered: ${ok}`);
  console.log(`  Failed:   ${err}`);
  console.log(`  Progress: ${PROGRESS_FILE}`);
  process.exit(err ? 1 : 0);
}

migrateExisting(parseArgs(process.argv.slice(2))).catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});