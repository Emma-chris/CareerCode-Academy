import { query } from './config/db';

interface CourseVideoRef {
  courseSlug: string;
  youtubeId: string;
  title: string;
}

const courseVideos: CourseVideoRef[] = [
  // ── School of Business & Digital Careers ──
  {
    courseSlug: 'data-visualization',
    youtubeId: 'C4t6qfHZ6Tw',
    title: 'D3.js Data Visualization (freeCodeCamp)',
  },
  {
    courseSlug: 'responsive-web-design',
    youtubeId: 'dX8396ZmSPk',
    title: 'HTML & CSS Full Course (freeCodeCamp)',
  },
  {
    courseSlug: 'software-engineering-design-patterns',
    youtubeId: 'WycvzYFRF6U',
    title: 'Design Patterns in Java (The Curious Coder)',
  },
  {
    courseSlug: 'quality-assurance',
    youtubeId: 'QJqNYhiHysM',
    title: 'QA Manual Testing Full Course (SDET-QA)',
  },
  {
    courseSlug: 'git-version-control-mastery',
    youtubeId: 'vA5TTz6BXhY',
    title: 'Git & GitHub Crash Course 2025 (Traversy Media)',
  },
  {
    courseSlug: 'graphic-design-with-figma',
    youtubeId: 'jQ1sfKIl50E',
    title: 'Figma Tutorial for Beginners (Flux Academy)',
  },

  // ── School of Data & AI ──
  {
    courseSlug: 'python-for-everybody',
    youtubeId: 'mPuvChrlH3Q',
    title: 'Python for Everybody (freeCodeCamp)',
  },
  {
    courseSlug: 'scientific-computing-with-python',
    youtubeId: 'QUT1VHiLmmI',
    title: 'Python NumPy Tutorial (freeCodeCamp)',
  },
  {
    courseSlug: 'college-algebra-with-python',
    youtubeId: 'mPuvChrlH3Q',
    title: 'Python for Everybody (freeCodeCamp)',
  },
  {
    courseSlug: 'machine-learning',
    youtubeId: 'hDKCxebp88A',
    title: 'Machine Learning with Python (freeCodeCamp)',
  },
  {
    courseSlug: 'artificial-intelligence',
    youtubeId: 'LGCZ-Fhm48c',
    title: 'AI Full Course 2025 (Simplilearn)',
  },
  {
    courseSlug: 'database-systems-sql',
    youtubeId: 'qw--VYLpxG4',
    title: 'PostgreSQL Full Course (freeCodeCamp)',
  },

  // ── School of Design & Creative Technology ──
  {
    courseSlug: 'ui-ux-design-fundamentals',
    youtubeId: 'pLCy3dKk4wA',
    title: 'UI/UX Full Course (Simplilearn)',
  },
];

function getYoutubeUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

async function seedYoutubeReferences() {
  try {
    console.log('╔════════════════════════════════════════╗');
    console.log('║  YouTube Reference Video Seeder       ║');
    console.log('╚════════════════════════════════════════╝\n');

    let updatedCourses = 0;
    let updatedLessons = 0;
    let skippedCourses = 0;

    for (const ref of courseVideos) {
      const videoUrl = getYoutubeUrl(ref.youtubeId);

      // Find the course
      const courseResult = await query(
        'SELECT id, title FROM courses WHERE slug = $1',
        [ref.courseSlug]
      );

      if (courseResult.rows.length === 0) {
        console.log(`  SKIP: Course "${ref.courseSlug}" not found in database`);
        skippedCourses++;
        continue;
      }

      const course = courseResult.rows[0];

      // Update all lessons for this course with the YouTube URL
      const result = await query(
        'UPDATE lessons SET video_url = $1 WHERE course_id = $2 RETURNING id',
        [videoUrl, course.id]
      );

      const count = result.rowCount || 0;
      updatedCourses++;
      updatedLessons += count;

      console.log(`  ✓ ${course.title}`);
      console.log(`    → ${count} lessons updated`);
      console.log(`    → ${ref.title}`);
      console.log(`    → ${videoUrl}\n`);
    }

    console.log('╔════════════════════════════════════════╗');
    console.log('║  Summary                              ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`  Courses updated:  ${updatedCourses}`);
    console.log(`  Lessons updated:  ${updatedLessons}`);
    console.log(`  Courses skipped:  ${skippedCourses}`);
    console.log(`  Total videos:     ${courseVideos.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('Failed to seed YouTube references:', error);
    process.exit(1);
  }
}

seedYoutubeReferences();
