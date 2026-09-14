import { query } from './config/db';
import fs from 'fs';
import path from 'path';

/**
 * Stores Coursera reference links (metadata + landing-page URLs) on the 13
 * target courses. Coursera streams are DRM/paywalled, so this never attempts
 * to fetch or embed Coursera video — it records the recommended free/auditable
 * Coursera course so students can study the same topics there too.
 *
 * Source of truth: docs/coursera-refs.json (curated, human-verified links).
 * The old public catalog search API (courses.v1 / onDemandCourseDiscovery) is
 * retired, so curation is the reliable path.
 */
const REFS_FILE = path.join(process.cwd(), '..', 'docs', 'coursera-refs.json');

interface CourseraRef {
  courseSlug: string;
  courseraTitle: string;
  courseraUrl: string;
  provider: string;
  rating?: string;
  skills: string[];
  modules: string[];
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Coursera reference link seeder              ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  let refs: CourseraRef[];
  try {
    refs = JSON.parse(fs.readFileSync(REFS_FILE, 'utf8'));
  } catch (e: any) {
    console.error(`Cannot read ${REFS_FILE}: ${e.message}`);
    process.exit(1);
  }

  await query('ALTER TABLE courses ADD COLUMN IF NOT EXISTS reference_url TEXT');
  console.log('✓ courses.reference_url column ensured\n');

  let updated = 0;
  let skipped = 0;
  for (const ref of refs) {
    const { rows } = await query('SELECT id, title FROM courses WHERE slug = $1', [ref.courseSlug]);
    if (rows.length === 0) {
      console.log(`  SKIP: "${ref.courseSlug}" not found`);
      skipped++;
      continue;
    }
    await query('UPDATE courses SET reference_url = $1, updated_at = NOW() WHERE id = $2', [
      ref.courseraUrl,
      rows[0].id,
    ]);
    console.log(`  ✓ ${rows[0].title}`);
    console.log(`    → ${ref.courseraTitle} (${ref.provider}) — ${ref.courseraUrl.split('/learn/')[1]}`);
    console.log(`      rating ${ref.rating || 'n/a'} | ${(ref.skills?.length || 0)} skills | ${(ref.modules?.length || 0)} modules`);
    updated++;
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  Summary                                    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Ref file: ${REFS_FILE}`);
  console.log('');
  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});