import { query as db } from './config/db';
import { uploadFile } from './config/storage';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
const TEMP_DIR = path.join(process.cwd(), 'temp_yt_videos');
const PROGRESS_FILE = path.join(process.cwd(), 'yt_sync_progress.json');

interface Progress {
  processed: string[]; // lesson IDs already done
  lastCourse: string;
  lastLesson: string;
}

function loadProgress(): Progress {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
  } catch {
    return { processed: [], lastCourse: '', lastLesson: '' };
  }
}

function saveProgress(p: Progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

function slugify(s: string) {
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

interface YtSearchResult {
  id: string;
  title: string;
  duration: number;
  webpage_url: string;
}

async function searchYouTube(query: string): Promise<YtSearchResult | null> {
  try {
    const cmd = `yt-dlp --flat-playlist --dump-json --no-warnings "ytsearch1:${query.replace(/"/g, '\\"')}" 2>NUL`;
    const { stdout } = await execAsync(cmd, { timeout: 30000, shell: 'cmd.exe' });
    const lines = stdout.trim().split('\n').filter(Boolean);
    if (lines.length === 0) return null;
    const data = JSON.parse(lines[0]);
    return {
      id: data.id,
      title: data.title || data.fulltitle || '',
      duration: data.duration || 0,
      webpage_url: `https://youtube.com/watch?v=${data.id}`,
    };
  } catch {
    return null;
  }
}

async function getVideoDuration(videoId: string): Promise<number> {
  try {
    const cmd = `yt-dlp --dump-json --no-warnings "https://youtube.com/watch?v=${videoId}" 2>NUL`;
    const { stdout } = await execAsync(cmd, { timeout: 30000, shell: 'cmd.exe' });
    const data = JSON.parse(stdout.trim());
    return data.duration || 0;
  } catch {
    return 0;
  }
}

async function downloadVideo(videoUrl: string, lessonId: string): Promise<Buffer | null> {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const outputPath = path.join(TEMP_DIR, `${lessonId}.mp4`);

  try {
    const cmd = `yt-dlp -f "best[height<=720][ext=mp4]" --no-warnings -o "${outputPath}" "${videoUrl}" 2>NUL`;
    await execAsync(cmd, { timeout: 300000, shell: 'cmd.exe' }); // 5 min per video

    if (fs.existsSync(outputPath)) {
      const buffer = fs.readFileSync(outputPath);
      fs.unlinkSync(outputPath); // clean up
      return buffer;
    }
    return null;
  } catch {
    // try with any format
    try {
      const cmd = `yt-dlp -f "best[height<=720]" --no-warnings --merge-output-format mp4 -o "${outputPath}" "${videoUrl}" 2>NUL`;
      await execAsync(cmd, { timeout: 300000, shell: 'cmd.exe' });
      if (fs.existsSync(outputPath)) {
        const buffer = fs.readFileSync(outputPath);
        fs.unlinkSync(outputPath);
        return buffer;
      }
      // check for other extensions
      const files = fs.readdirSync(TEMP_DIR).filter(f => f.startsWith(lessonId));
      if (files.length > 0) {
        const fp = path.join(TEMP_DIR, files[0]);
        const buffer = fs.readFileSync(fp);
        fs.unlinkSync(fp);
        return buffer;
      }
      return null;
    } catch {
      // clean up any leftover temp files
      const files = fs.readdirSync(TEMP_DIR).filter(f => f.startsWith(lessonId));
      for (const f of files) {
        try { fs.unlinkSync(path.join(TEMP_DIR, f)); } catch {}
      }
      return null;
    }
  }
}

async function processLesson(
  lesson: { id: string; title: string; course_title: string; module_title: string | null; order_index: number }
): Promise<boolean> {
  const query = buildSearchQuery(lesson.course_title, lesson.module_title, lesson.title);
  console.log(`  ╰ Searching: "${query}"`);

  const result = await searchYouTube(query);
  if (!result) {
    console.log(`  ╰ ⚠ No results found`);
    return false;
  }

  console.log(`  ╰ Found: "${result.title?.substring(0, 80)}" (${result.id})`);

  // Download video
  console.log(`  ╰ Downloading...`);
  const buffer = await downloadVideo(result.webpage_url, lesson.id);
  if (!buffer) {
    console.log(`  ╰ ✗ Download failed`);
    return false;
  }

  console.log(`  ╰ Uploading to R2 (${(buffer.length / 1024 / 1024).toFixed(1)} MB)...`);

  try {
    const fileName = `${lesson.course_title.replace(/[^a-z0-9]/gi, '_')}_Lesson_${lesson.order_index}_${lesson.title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
    const url = await uploadFile(buffer, fileName, 'videos');
    console.log(`  ╰ ✓ Uploaded: ${url?.substring(0, 80)}...`);

    // Get duration from yt-dlp metadata
    const duration = result.duration || await getVideoDuration(result.id);

    // Update DB
    await db(
      `UPDATE lessons SET video_url = $1, duration = $2 WHERE id = $3`,
      [url, duration, lesson.id]
    );

    console.log(`  ╰ ✓ DB updated (duration: ${duration}s)`);
    return true;
  } catch (err: any) {
    console.log(`  ╰ ✗ Upload/DB error: ${err.message}`);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const onlyCourse = args[0];
  const skipDownload = process.argv.includes('--urls-only');

  console.log('╔════════════════════════════════════════╗');
  console.log('║   YouTube → R2 Course Video Seeder     ║');
  console.log('╚════════════════════════════════════════╝\n');

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const progress = loadProgress();
  console.log(`Resuming from ${progress.processed.length} already processed lessons\n`);

  // Fetch all courses with their lessons and modules
  const courses = await db(`
    SELECT c.id, c.title as course_title, c.slug,
           l.id as lesson_id, l.title as lesson_title,
           l.order_index, l.video_url, l.duration as lesson_duration,
           m.title as module_title
    FROM courses c
    JOIN lessons l ON l.course_id = c.id
    LEFT JOIN modules m ON l.module_id = m.id
    ORDER BY c.title, l.order_index
  `);

  // Group by course
  const courseMap: Record<string, any> = {};
  for (const row of courses.rows) {
    if (!courseMap[row.course_title]) {
      courseMap[row.course_title] = {
        id: row.id,
        title: row.course_title,
        slug: row.slug,
        lessons: [],
      };
    }
    courseMap[row.course_title].lessons.push({
      id: row.lesson_id,
      title: row.lesson_title,
      course_title: row.course_title,
      module_title: row.module_title,
      order_index: row.order_index,
      video_url: row.video_url,
      duration: row.lesson_duration,
    });
  }

  const courseTitles = Object.keys(courseMap).filter(t =>
    !onlyCourse || courseMap[t].slug === onlyCourse
  );

  console.log(`Found ${courseTitles.length} courses with ${courses.rows.length} total lessons\n`);

  let processed = 0;
  let succeeded = 0;

  for (const courseTitle of courseTitles) {
    const course = courseMap[courseTitle];
    console.log(`\n📚 ${courseTitle} (${course.lessons.length} lessons)`);

    for (let i = 0; i < course.lessons.length; i++) {
      const lesson = course.lessons[i];

      // Skip if already processed
      if (progress.processed.includes(lesson.id)) {
        processed++;
        continue;
      }

      console.log(`  [${i + 1}/${course.lessons.length}] ${lesson.title}`);

      if (skipDownload) {
        // Just search and store URL without downloading
        const query = buildSearchQuery(lesson.course_title, lesson.module_title, lesson.title);
        const result = await searchYouTube(query);
        if (result) {
          const duration = result.duration || await getVideoDuration(result.id);
          await db(
            `UPDATE lessons SET video_url = $1, duration = $2 WHERE id = $3`,
            [result.webpage_url, duration, lesson.id]
          );
          console.log(`  ╰ ✓ Stored URL: ${result.id}`);
          succeeded++;
        } else {
          console.log(`  ╰ ⚠ No results`);
        }

        progress.processed.push(lesson.id);
        progress.lastCourse = courseTitle;
        progress.lastLesson = lesson.title;
        saveProgress(progress);
        processed++;
      } else {
        // Full download + upload
        const ok = await processLesson(lesson);
        if (ok) succeeded++;

        progress.processed.push(lesson.id);
        progress.lastCourse = courseTitle;
        progress.lastLesson = lesson.title;
        saveProgress(progress);
        processed++;

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  // Cleanup
  try {
    if (fs.existsSync(TEMP_DIR)) {
      const remaining = fs.readdirSync(TEMP_DIR);
      if (remaining.length === 0) {
        fs.rmdirSync(TEMP_DIR);
      }
    }
  } catch {}

  console.log(`\n╔════════════════════════════════════════╗`);
  console.log(`║   Done!                                ║`);
  console.log(`║   Processed: ${processed} lessons               ║`);
  console.log(`║   Succeeded: ${succeeded} lessons               ║`);
  console.log(`╚════════════════════════════════════════╝`);
}

main().catch(e => {
  console.error('\nFatal error:', e.message);
  process.exit(1);
});
