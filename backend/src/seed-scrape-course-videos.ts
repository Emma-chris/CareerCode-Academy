import { query } from './config/db';
import { run } from './lesson-pipeline/utils';
import fs from 'fs';
import path from 'path';

/**
 * Scrapes a unique YouTube reference video for every lesson in the three
 * target school tracks (Business & Digital, Data & AI, Design & Creative).
 *
 * Uses yt-dlp's search ("ytsearchN:") to discover candidate videos and ranks
 * them by channel reputation / duration / title relevance. Only the video URL
 * is stored (lessons.video_url) — nothing is downloaded or re-hosted, so this
 * stays within the "reference only" policy.
 *
 * Usage:
 *   npm run seed:yt:scrape            # update all lessons in the 3 tracks
 *   npm run seed:yt:scrape -- --dry-run
 *   npm run seed:yt:scrape -- --limit 5
 *   npm run seed:yt:scrape -- --only-missing
 */

const TARGET_COURSES = [
  'data-visualization',
  'responsive-web-design',
  'software-engineering-design-patterns',
  'quality-assurance',
  'git-version-control-mastery',
  'graphic-design-with-figma',
  'python-for-everybody',
  'scientific-computing-with-python',
  'college-algebra-with-python',
  'machine-learning',
  'artificial-intelligence',
  'database-systems-sql',
  'ui-ux-design-fundamentals',
];

const PREFERRED_CHANNELS = [
  'freecodecamp',
  'simplilearn',
  'traversy media',
  'the net ninja',
  'tech with tim',
  'corey schafer',
  'sentdex',
  'programming with mosh',
  'kudvenkat',
  'telusko',
  'edureka',
  'edureka!',
  'intellipaat',
  'great learning',
  'coursera',
  'google career certificates',
  'meta developers',
  'web dev simplified',
  'fireship',
  'kevin powell',
  'the foundry',
  'flux academy',
  'dave gray',
  'bro code',
  'apna college',
];

const DESCRIPTION_MARKERS = [
  'full course',
  'tutorial',
  'crash course',
  'course',
  'complete',
  'beginner',
  'learn',
  'introduction',
  'overview',
  'python',
  'machine learning',
  'sql',
  'figma',
  'git',
  'algorithm',
];

const MIN_DURATION = 120; // 2 minutes
const MAX_DURATION = 3600; // 1 hour
const SEARCH_SLEEP_MS = 1200;
const SEARCH_TIMEOUT_MS = 45000;

const PROGRESS_FILE = path.join(process.cwd(), 'yt_scrape_progress.json');

interface LessonRow {
  id: string;
  lesson_title: string;
  course_title: string;
  course_slug: string;
  module_title: string | null;
  order_index: number;
  video_url: string | null;
}

interface YtCandidate {
  id: string;
  title: string;
  channel: string;
  duration: number;
  view_count: number;
  url: string;
}

interface CliOptions {
  dryRun: boolean;
  limit: number;
  onlyMissing: boolean;
  resume: boolean;
  reprocessDupes: boolean;
  course?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = { dryRun: false, limit: Infinity, onlyMissing: false, resume: false, reprocessDupes: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--only-missing') opts.onlyMissing = true;
    else if (a === '--resume') opts.resume = true;
    else if (a === '--reprocess-dupes') opts.reprocessDupes = true;
    else if (a === '--course') opts.course = argv[++i];
    else if (a === '--limit') opts.limit = parseInt(argv[++i], 10) || Infinity;
  }
  return opts;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function buildSearchQuery(courseTitle: string, moduleTitle: string | null, lessonTitle: string): string {
  const parts = [slugify(courseTitle)];
  if (moduleTitle && !courseTitle.toLowerCase().includes(moduleTitle.toLowerCase())) {
    parts.push(slugify(moduleTitle));
  }
  parts.push(slugify(lessonTitle));
  return parts.join(' ') + ' tutorial';
}

const STOPWORDS = new Set([
  'and', 'the', 'of', 'for', 'to', 'in', 'on', 'with', 'a', 'an', 'from', 'your',
  'what', 'is', 'are', 'how', 'why', 'does', 'its', 'it', 'this', 'that',
  'introduction', 'intro', 'basics', 'fundamentals', 'tutorial', 'learn', 'master',
]);

function normalizeChannel(channel: string): string {
  return (channel || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function queryTerms(courseTitle: string, moduleTitle: string | null, lessonTitle: string): string[] {
  const words = `${lessonTitle} ${moduleTitle ?? ''}`.toLowerCase().split(/[^a-z0-9]+/);
  const terms = new Set<string>();
  for (const w of words) {
    if (w.length > 3 && !STOPWORDS.has(w)) terms.add(w);
  }
  return Array.from(terms);
}

function scoreCandidate(c: YtCandidate, terms: string[], usage: Map<string, number>): number {
  let score = 0;

  const usedTimes = usage.get(c.url) || 0;
  if (usedTimes >= 3) score -= 30 * (usedTimes - 1); // avoid over-using a single video

  if (c.duration >= MIN_DURATION && c.duration <= MAX_DURATION) {
    score += 40;
    if (c.duration >= 600 && c.duration <= 1800) score += 10; // 10–30min ideal
  } else if (c.duration > 0 && c.duration < MIN_DURATION) {
    score -= 50;
  } else if (c.duration > MAX_DURATION) {
    score -= 10;
  }

  const title = c.title.toLowerCase();

  let overlap = 0;
  for (const term of terms) {
    if (title.includes(term)) overlap += 4;
  }
  score += Math.min(20, overlap);

  if (/in\s+(\d+|a\s+few|under)\s+(minute|second|hour|minutes|seconds)s?\b/.test(title) || /\b\d+\s+min\b/.test(title)) {
    score -= 20; // "…in 5 minutes" clips are usually overviews, not lessons
  }

  for (const marker of DESCRIPTION_MARKERS) {
    if (title.includes(marker)) score += 2;
  }

  const channel = normalizeChannel(c.channel);
  for (const preferred of PREFERRED_CHANNELS) {
    if (channel.includes(preferred)) {
      score += 15;
      break;
    }
  }

  score += Math.min(10, Math.log10(Math.max(1, c.view_count))) * 2;

  return score;
}

function parseYtSearchOutput(stdout: string): YtCandidate[] {
  return stdout
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        const data = JSON.parse(line);
        return {
          id: data.id,
          title: data.title || data.fulltitle || '',
          channel: data.channel || data.uploader || '',
          duration: data.duration || 0,
          view_count: data.view_count || 0,
          url: `https://youtube.com/watch?v=${data.id}`,
        } as YtCandidate;
      } catch {
        return null;
      }
    })
    .filter((c): c is YtCandidate => c !== null && !!c.id);
}

function cookiesFlag(): string {
  const candidates = [
    path.join(process.cwd(), 'm.youtube.com_cookies.txt'),
    path.join(process.cwd(), '..', 'm.youtube.com_cookies.txt'),
  ];
  const existing = candidates.find((p) => fs.existsSync(p));
  return existing ? ` --cookies "${existing}"` : '';
}

function resolveYtDlp(): string {
  if (process.env.YTDLP_BIN && fs.existsSync(process.env.YTDLP_BIN)) {
    return process.env.YTDLP_BIN;
  }
  const local = path.join(process.cwd(), 'tools', 'yt-dlp.exe');
  if (fs.existsSync(local)) return local;
  return 'yt-dlp';
}

async function searchYouTube(query: string, terms: string[], usage: Map<string, number>): Promise<YtCandidate | null> {
  const q = query.replace(/["']/g, '');
  const bin = resolveYtDlp();
  const command = `"${bin}" --flat-playlist --dump-json --no-warnings${cookiesFlag()} "ytsearch5:${q}"`;
  try {
    const stdout = await run(command, { timeout: SEARCH_TIMEOUT_MS });
    const candidates = parseYtSearchOutput(stdout);
    if (candidates.length === 0) return null;

    const scored = candidates
      .map((c) => ({ c, score: scoreCandidate(c, terms, usage) }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    console.log(`    → cand: ${candidates.map((x) => x.id).join(', ')}`);
    console.log(`    → best: ${best.c.title.substring(0, 70)} (${best.c.channel || '?'}) [${best.score} pts]`);
    return best.c;
  } catch {
    return null;
  }
}

function loadProgress(): Record<string, string> {
  try {
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    return data?.lessonUrl ?? {};
  } catch {
    return {};
  }
}

function saveProgress(map: Record<string, string>) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ lessonUrl: map }, null, 2), 'utf8');
}

async function main(opts: CliOptions) {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  YouTube per-lesson reference video scraper  ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  console.log(`  mode:        ${opts.dryRun ? 'DRY RUN (no writes)' : 'UPDATE'}`);
  console.log(`  only-missing:${opts.onlyMissing}`);
  console.log(`  resume:      ${opts.resume}\n`);

  const slugList = opts.course ? [opts.course] : TARGET_COURSES;

  const { rows } = await query<LessonRow>(
    `SELECT l.id, l.title AS lesson_title, l.video_url, l.order_index,
            c.title AS course_title, c.slug AS course_slug,
            m.title AS module_title
       FROM lessons l
       JOIN courses c ON c.id = l.course_id
       LEFT JOIN modules m ON l.module_id = m.id
      WHERE c.slug = ANY($1)
      ORDER BY c.slug, l.order_index`,
    [slugList]
  );

  console.log(`  Found ${rows.length} lessons in "${slugList.join('", "')}"\n`);

  const progress = loadProgress();

  const usage = new Map<string, number>();
  for (const lesson of rows) {
    if (lesson.video_url) usage.set(lesson.video_url, (usage.get(lesson.video_url) || 0) + 1);
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;

  for (const lesson of rows) {
    if (processed >= opts.limit) break;

    const isDup = !!lesson.video_url && (usage.get(lesson.video_url) || 0) >= 3;

    if (opts.onlyMissing && lesson.video_url) {
      skipped++;
      continue;
    }
    if (opts.resume && progress[lesson.id] && !(opts.reprocessDupes && isDup)) {
      skipped++;
      continue;
    }
    if (opts.reprocessDupes && !isDup) {
      skipped++;
      continue;
    }

    const queryText = buildSearchQuery(lesson.course_title, lesson.module_title, lesson.lesson_title);
    const terms = queryTerms(lesson.course_title, lesson.module_title, lesson.lesson_title);
    console.log(`  [${progress[lesson.id] ? 'again' : 'new'}] ${lesson.course_title} → ${lesson.lesson_title}`);
    console.log(`    ? query: "${queryText}"`);
    console.log(`    ? terms: ${terms.join(', ')}`);

    const result = await searchYouTube(queryText, terms, usage);

    if (!result) {
      console.log(`    ✗ no usable result`);
      failed++;
      processed++;
      continue;
    }

    if (opts.dryRun) {
      console.log(`    · would set video_url to ${result.url}`);
    } else {
      await query('UPDATE lessons SET video_url = $1, updated_at = NOW() WHERE id = $2', [
        result.url,
        lesson.id,
      ]);
      progress[lesson.id] = result.url;
      saveProgress(progress);
      const prev = lesson.video_url;
      if (prev) usage.set(prev, Math.max(0, (usage.get(prev) || 1) - 1));
      usage.set(result.url, (usage.get(result.url) || 0) + 1);
      console.log(`    ✓ ${result.url}`);
    }

    updated++;
    processed++;
    await new Promise((r) => setTimeout(r, SEARCH_SLEEP_MS));
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  Summary                                    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Processed:      ${processed}`);
  console.log(`  Updated:        ${updated}`);
  console.log(`  Skipped:        ${skipped}`);
  console.log(`  Failed:         ${failed}`);
  console.log(`  Dry run:        ${opts.dryRun ? 'yes — no rows changed' : 'no'}`);
  if (!opts.dryRun && opts.resume) {
    console.log(`  Progress file:  ${PROGRESS_FILE}`);
  }
  console.log('');
  process.exit(0);
}

main(parseArgs(process.argv.slice(2))).catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});