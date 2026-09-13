import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { query } from '../config/db';
import { LessonReference, lessonDir, slugify } from './types';
import { parseArgs, run, ensureDir, writeJson, readJson, execAsync } from './utils';

// Extracts a YouTube video ID from common URL shapes.
export function extractYoutubeId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function cookiesFlag(): string {
  const cookies = path.join(process.cwd(), 'm.youtube.com_cookies.txt');
  const local = path.join(process.cwd(), '..', 'm.youtube.com_cookies.txt');
  const existing = [cookies, local].find((p) => fs.existsSync(p));
  return existing ? ` --cookies "${existing}"` : '';
}

function parseVtt(vtt: string): string {
  return vtt
    .split(/\r?\n/)
    .filter((line) => /[a-zA-Z]/i.test(line))
    .filter((line) => !line.startsWith('WEBVTT'))
    .filter((line) => !line.includes('-->'))
    .filter((line) => !/^\d{2}:\d{2}/.test(line.trim()))
    .filter((line) => !line.trim().startsWith('Kind:') && !line.trim().startsWith('Language:'))
    .map((line) => line.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 12000);
}

interface FetchOptions {
  lesson?: string;
  course?: string;
}

// Downloads only transcript+metadata for a YouTube URL. Returns captured text or null.
async function fetchYoutubeReference(url: string, outDir: string): Promise<{
  source: LessonReference['source'];
  description?: string;
  transcript?: string;
} | null> {
  const id = extractYoutubeId(url);
  if (!id) return null;

  try {
    // 1. Metadata (title/channel/duration/description)
    let meta: any = null;
    try {
      const out = await run(
        `yt-dlp --dump-json --no-warnings --skip-download ${cookiesFlag()} "https://youtube.com/watch?v=${id}"`,
        { timeout: 45000 }
      );
      meta = JSON.parse(out.trim().split('\n')[0]);
    } catch {
      meta = null;
    }

    // 2. Auto/manual English subs (~ transcript), no media
    let transcript: string | undefined;
    try {
      const base = path.join(outDir, `ytref`);
      await run(
        `yt-dlp --skip-download --write-auto-subs --write-subs --sub-langs "en,en-orig" --sub-format "vtt/srt/best" --no-warnings ${cookiesFlag()} -o "${base}.%(ext)s" "https://youtube.com/watch?v=${id}"`,
        { timeout: 60000 }
      );
      const vttFiles = fs.existsSync(outDir)
        ? fs.readdirSync(outDir).filter((f) => f.startsWith('ytref.') && /\.(vtt|srt|json3)$/i.test(f))
        : [];
      for (const f of vttFiles) {
        const text = fs.readFileSync(path.join(outDir, f), 'utf8');
        if (/\.vtt$|\.srt$/i.test(f)) transcript = parseVtt(text);
        else {
          // json3
          try {
            const data = JSON.parse(text);
            if (data?.events) {
              transcript = data.events
                .map((e: any) => (e.segs || []).map((s: any) => s.utf8).join(''))
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
            }
          } catch {}
        }
        if (transcript) break;
      }
      // cleanup reference source files (keep it source-light)
      for (const f of vttFiles) {
        try { fs.unlinkSync(path.join(outDir, f)); } catch {}
      }
    } catch {
      transcript = undefined;
    }

    return {
      source: {
        youtube_id: id,
        url: `https://youtube.com/watch?v=${id}`,
        title: meta?.title || undefined,
        channel: meta?.channel || meta?.uploader || undefined,
        duration: meta?.duration || undefined,
      },
      description: meta?.description || undefined,
      transcript: transcript && transcript.length > 40 ? transcript : undefined,
    };
  } catch {
    return null;
  }
}

async function fetchReference(opts: FetchOptions) {
  let targetId = opts.lesson;
  if (!targetId) {
    const { rows } = await query(
      `SELECT l.id FROM lessons l JOIN courses c ON c.id = l.course_id WHERE c.slug = $1 ORDER BY l.order_index LIMIT 1`,
      [opts.course]
    );
    targetId = rows[0]?.id;
  }
  if (!targetId) {
    console.error('Provide --lesson <id> or --course <slug>');
    process.exit(1);
  }

  const { rows } = await query(
    `SELECT l.id, l.title, l.description, l.video_url,
            c.slug AS course_slug, c.title AS course_title
       FROM lessons l JOIN courses c ON c.id = l.course_id
      WHERE l.id = $1`,
    [targetId]
  );
  const lesson = rows[0];
  if (!lesson) {
    console.error(`Lesson not found: ${targetId}`);
    process.exit(1);
  }

  const dir = path.join(process.cwd(), lessonDir(lesson.course_slug, slugify(lesson.title)));
  ensureDir(dir);
  const refFile = path.join(dir, 'reference.json');
  const existing = readJson<LessonReference>(refFile);

  let ref: LessonReference;

  if (lesson.video_url && extractYoutubeId(lesson.video_url)) {
    console.log(`Fetching reference for "${lesson.title}" from ${extractYoutubeId(lesson.video_url)}...`);
    const captured = await fetchYoutubeReference(lesson.video_url, dir);
    ref = {
      lesson_id: lesson.id,
      source: captured?.source || null,
      description: captured?.description || lesson.description,
      transcript: captured?.transcript,
      captured_at: new Date().toISOString(),
    };
  } else {
    console.log(`No YouTube URL on lesson — writing metadata-only reference.`);
    ref = {
      lesson_id: lesson.id,
      source: null,
      description: lesson.description,
      captured_at: new Date().toISOString(),
    };
  }

  writeJson(refFile, ref);
  console.log('reference.json written.');
  console.log(`  source:      ${ref.source ? Array.from(Object.entries(ref.source), ([k, v]) => `${k}=${v}`).join(', ') : 'none (lesson metadata only)'}`);
  console.log(`  transcript:  ${ref.transcript ? ref.transcript.length + ' chars' : 'unavailable'}`);
  console.log(`  location:    ${refFile}`);
  console.log(existing && existing.lesson_id === ref.lesson_id && existing.source?.url === ref.source?.url
    ? '  note: overwrote an earlier reference for the same lesson/source.'
    : '');

  process.exit(0);
}

fetchReference(parseArgs(process.argv.slice(2))).catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});