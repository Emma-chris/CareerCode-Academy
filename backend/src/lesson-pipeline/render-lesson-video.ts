import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { query } from '../config/db';
import { uploadFile } from '../config/storage';
import { LessonScript, lessonDir, slugify, MIN_SCENE_SECONDS } from './types';
import { parseArgs, readJson, probeDuration, ensureDir, run, ff } from './utils';
import { ensureVoiceover } from './voiceover';
import { renderScenes } from './scenes';

interface Options {
  lesson?: string;
  course?: string;
  force?: boolean;
}

function resolveLessonRow(row: any) {
  if (!row) {
    console.error('Lesson not found.');
    process.exit(1);
  }
  return row;
}

async function resolveTarget(opts: Options) {
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
    `SELECT l.id, l.title, l.duration, c.slug AS course_slug, c.title AS course_title
       FROM lessons l JOIN courses c ON c.id = l.course_id WHERE l.id = $1`,
    [targetId]
  );
  return resolveLessonRow(rows[0]);
}

async function renderLesson(opts: Options) {
  const lesson = await resolveTarget(opts);
  const dir = path.join(process.cwd(), lessonDir(lesson.course_slug, slugify(lesson.title)));
  const script = readJson<LessonScript>(path.join(dir, 'script.json'));

  if (!script?.scenes?.length) {
    console.error(`No script.json for "${lesson.title}". Run lesson:script first.`);
    process.exit(1);
  }
  if (script.status !== 'reviewed' && !opts.force) {
    console.error(`Script for "${lesson.title}" is still "${script.status}".`);
    console.error('Set  "status": "reviewed"  in script.json after human review, or pass --force.');
    process.exit(1);
  }

  console.log(`\n=== Rendering "${lesson.title}" (${script.scenes.length} scenes) ===\n`);

  // 1. Voiceover
  console.log('[1/5] Voiceover...');
  const voices = await ensureVoiceover(script, dir);

  // 2. Scene duration plan (from measured audio)
  const plannedDurs: number[] = [];
  let totalPlanned = 0;
  for (let i = 0; i < script.scenes.length; i++) {
    const audioDur = voices[i]?.duration || 4;
    const d = Math.max(MIN_SCENE_SECONDS, Math.ceil(audioDur) + 1);
    plannedDurs.push(d);
    totalPlanned += d;
  }

  // 3. Render scenes
  console.log(`[2/5] Rendering ${script.scenes.length} motion-graphic scenes (~${totalPlanned}s)...`);
  const sceneFiles = await renderScenes({
    courseTitle: lesson.course_title,
    lessonTitle: lesson.title,
    scenes: script.scenes,
    durations: plannedDurs,
    cwd: dir,
  });

  // 4. Concat scenes → visual.mp4 (measure actual)
  console.log('[3/5] Concatenating scenes...');
  const scenesDir = path.join(dir, 'scenes');
  const concatTxt = path.join(scenesDir, 'concat.txt');
  fs.writeFileSync(
    concatTxt,
    sceneFiles.map((f) => `file '${path.basename(f)}'`).join('\n'),
    'utf8'
  );
  const visual = path.join(dir, 'visual.mp4');
  await run(
    `${ff()} -y -f concat -safe 0 -i "${concatTxt}" -c copy "${visual}"`,
    { cwd: scenesDir, timeout: 300000 }
  );

  const totalSecs = await probeDuration(visual);
  if (!totalSecs) throw new Error('concat produced invalid visual.mp4');
  console.log(`    visual.mp4 = ${totalSecs.toFixed(1)}s`);

  // 5. Mux narration onto the timeline
  console.log('[4/5] Muxing narration audio...');
  const finalMp4 = path.join(dir, 'lesson.mp4');
  const inputArgs: string[] = [];
  const filtParts: string[] = [];
  const audioLabels: string[] = [];
  const sceneDurs: number[] = [];
  for (const f of sceneFiles) {
    sceneDurs.push((await probeDuration(f)) || MIN_SCENE_SECONDS);
  }
  const totalSecsMs = totalSecs * 1000;
  let cursorSecs = 0;
  let inputIdx = 1; // 0 is visual.mp4

  for (let i = 0; i < script.scenes.length; i++) {
    const file = voices[i]?.file;
    if (!file) {
      cursorSecs += sceneDurs[i];
      continue;
    }

    inputArgs.push('-i', `"${file}"`);

    const startMs = Math.round(cursorSecs * 1000);
    const label = `[a${i}]`;
    filtParts.push(
      `[${inputIdx}:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,` +
      `adelay=${startMs}|${startMs},apad=whole_dur=${totalSecs.toFixed(3)},atrim=0:${totalSecs.toFixed(3)}${label}`
    );
    audioLabels.push(label);
    inputIdx++;
    cursorSecs += sceneDurs[i];
  }

  if (audioLabels.length === 0) {
    throw new Error('No narration audio to mux.');
  }

  const amix = `${audioLabels.join('')}amix=inputs=${audioLabels.length}:duration=longest:normalize=0[aout]`;
  const filterGraph = [...filtParts, amix].join(';');

  if (filterGraph.includes('"')) throw new Error('mux filter graph contains a double quote');

  await run(
    `${ff()} -y -i "${visual}" ${inputArgs.join(' ')} -filter_complex "${filterGraph}" ` +
    `-map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 128k -movflags +faststart "${finalMp4}"`,
    { timeout: 300000 }
  );

  console.log(`    lesson.mp4 = ${(await probeDuration(finalMp4) || 0).toFixed(1)}s`);

  // 6. Thumbnail + upload
  console.log('[5/5] Thumbnail + upload...');
  const thumb = path.join(dir, 'lesson.jpg');
  await run(`${ff()} -y -ss 1 -i "${finalMp4}" -frames:v 1 -q:v 2 "${thumb}"`, { timeout: 60000 });

  const mp4Buffer = fs.readFileSync(finalMp4);
  const thumbBuffer = fs.existsSync(thumb) ? fs.readFileSync(thumb) : null;

  const safe = (s: string) => s.replace(/[^a-zA-Z0-9]+/g, '_');
  const videoUrl = await uploadFile(mp4Buffer, `${safe(lesson.course_title)}_${safe(lesson.title)}.mp4`, 'videos');
  let thumbUrl: string | null = null;
  if (thumbBuffer) {
    thumbUrl = await uploadFile(thumbBuffer, `${safe(lesson.course_title)}_${safe(lesson.title)}.jpg`, 'videos');
  }

  await query(`UPDATE lessons SET video_url = $1, video_thumbnail = $2, duration = $3, script = $4::jsonb WHERE id = $5`, [
    videoUrl,
    thumbUrl,
    Math.round(totalSecs),
    script,
    lesson.id,
  ]);

  console.log('\n=== COMPLETE ===');
  console.log(`  video_url:   ${videoUrl}`);
  console.log(`  thumbnail:   ${thumbUrl || '(none)'}`);
  console.log(`  duration:    ${Math.round(totalSecs)}s`);
  console.log(`  assets:      ${dir}`);
  process.exit(0);
}

renderLesson(parseArgs(process.argv.slice(2)) as any).catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});