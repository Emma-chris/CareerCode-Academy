import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

// ───────────── mocked modules ─────────────

const calls = [];
const returnPlan = [];

mock.module('../config/db.ts', {
  namedExports: {
    query: async (text, params) => {
      calls.push({ text, params });
      if (returnPlan.length > 0) return returnPlan.shift();
      return { rows: [] };
    },
  },
});

const GOALS = [
  {
    id: 'goal-1', slug: 'data-analyst', title: 'Data Analyst', role_title: 'Data Analyst',
    icon: 'BarChart3', color: 'from-blue-500 to-cyan-600', desired_skills: ['Python', 'SQL'],
    salary_band: 'NGN 2M-5M', duration_estimate: '6 months',
    school_name: 'Data', school_slug: 'data-ai', path_slug: 'career-goal-data-analyst',
    courses_count: 2, total_duration: 30, students_count: 3,
  },
];

const PURSUED = [
  {
    id: 'goal-1', title: 'Data Analyst', slug: 'data-analyst', role_title: 'Data Analyst',
    icon: 'BarChart3', color: 'from-blue-500 to-cyan-600', desired_skills: ['Python', 'SQL'],
    salary_band: 'NGN 2M-5M', duration_estimate: '6 months',
    school_name: 'Data', school_slug: 'data-ai', path_slug: 'career-goal-data-analyst',
    total_courses: 2, completed_courses: 0,
    progress: 40, completed: false, started_at: '2025-01-01T09:00:00Z',
  },
];

const CAREER_COURSES = [
  { id: 'c1', title: 'Python Foundations', slug: 'python-foundations', thumbnail: null, duration: 18, phase: 'core' },
  { id: 'c2', title: 'SQL for Analysts', slug: 'sql-for-analysts', thumbnail: null, duration: 12, phase: 'core' },
];

const SCHOOL_PATHS = [
  {
    slug: 'data-ai', name: 'Data & AI', icon: 'BrainCircuit',
    zones: {
      beginner: { path: { id: 'path-1', slug: 'data-ai-beginner', title: 'Beginner', level: 'beginner', description: 'x', thumbnail: null, duration: 20 } },
      intermediate: { path: null },
      advanced: { path: { id: 'path-2', slug: 'data-ai-advanced', title: 'Advanced', level: 'advanced', description: 'x', thumbnail: null, duration: 40 } },
    },
  },
];

const CATEGORY_PATHS = [];

mock.module('../models/careerGoal.ts', {
  namedExports: {
    getAllCareerGoals: async () => GOALS,
    getMyCareerGoals: async (userId) => PURSUED,
    getCareerGoalCourses: async (goalId) => CAREER_COURSES,
  },
});

mock.module('../models/learningPath.ts', {
  namedExports: {
    getGroupedBySchool: async () => SCHOOL_PATHS,
    getGroupedByCategory: async () => CATEGORY_PATHS,
  },
});

const PathwayFinderModel = await import('../models/pathwayFinder.ts');

function reset() {
  calls.length = 0;
  returnPlan.length = 0;
}

describe('pathway finder model — anonymous', () => {
  it('returns discoverable data with no enrichments and no db queries', async () => {
    reset();
    const data = await PathwayFinderModel.getPathwayFinderData();
    assert.equal(data.userId, null);
    assert.equal(data.summary.totalGoals, 1);
    assert.equal(data.summary.pursuedGoals, 0);
    assert.equal(data.discoverableGoals[0].isPursued, false);
    assert.equal(data.discoverableGoals[0].progress, 0);
    assert.equal(data.schoolPaths[0].zones.beginner.path.enrolled, false);
    assert.equal(data.schoolPaths[0].zones.beginner.path.progress, 0);
    assert.equal(calls.length, 0);
  });
});

describe('pathway finder model — authenticated', () => {
  it('annotates paths, computes summary and recommends the next step', async () => {
    reset();
    returnPlan.push({ rows: [{ course_id: 'c1' }] });                    // enrolled
    returnPlan.push({ rows: [{ course_id: 'c2' }] });                    // completed
    returnPlan.push({                                                     // path enrollments
      rows: [
        { path_id: 'path-1', progress: 55, completed: false, started_at: '2025-01-01T09:00:00Z' },
        { path_id: 'path-2', progress: 100, completed: true, started_at: '2024-06-01T09:00:00Z' },
      ],
    });

    const data = await PathwayFinderModel.getPathwayFinderData('user-1');

    assert.equal(data.userId, 'user-1');
    assert.deepEqual(data.summary, {
      totalGoals: 1,
      pursuedGoals: 1,
      completedGoals: 0,
      inProgressGoals: 1,
      enrolledPathsTotal: 2,
      inProgressPathways: 1,
      completedPathways: 1,
    });

    assert.deepEqual(calls[0].params, ['user-1']);
    assert.match(calls[1].text, /completed = true/i);

    const next = data.pursuedGoals[0].nextStep;
    assert.equal(next.courseId, 'c1');
    assert.equal(next.title, 'Python Foundations');
    assert.equal(next.phase, 'core');

    const mine = data.discoverableGoals.find((g) => g.id === 'goal-1');
    assert.equal(mine.isPursued, true);
    assert.equal(mine.progress, 40);

    const beginner = data.schoolPaths[0].zones.beginner.path;
    assert.equal(beginner.enrolled, true);
    assert.equal(beginner.progress, 55);
    assert.equal(beginner.pathCompleted, false);

    const advanced = data.schoolPaths[0].zones.advanced.path;
    assert.equal(advanced.enrolled, true);
    assert.equal(advanced.progress, 100);
    assert.equal(advanced.pathCompleted, true);
  });

  it('picks an enrolled-but-incomplete course over the first uncompleted one', async () => {
    reset();
    returnPlan.push({ rows: [{ course_id: 'c2' }] });  // only c2 enrolled
    returnPlan.push({ rows: [] });                     // nothing completed
    returnPlan.push({ rows: [] });                     // no path enrollments

    const data = await PathwayFinderModel.getPathwayFinderData('user-1');
    const next = data.pursuedGoals[0].nextStep;
    assert.equal(next.courseId, 'c2');
    assert.equal(next.title, 'SQL for Analysts');
  });

  it('returns null next step when all courses are completed', async () => {
    reset();
    returnPlan.push({ rows: [{ course_id: 'c1' }, { course_id: 'c2' }] }); // enrolled
    returnPlan.push({ rows: [{ course_id: 'c1' }, { course_id: 'c2' }] }); // both completed
    returnPlan.push({ rows: [] });

    const data = await PathwayFinderModel.getPathwayFinderData('user-1');
    assert.equal(data.pursuedGoals[0].nextStep, null);
    assert.equal(data.summary.completedGoals, 0); // goal row says completed=false
  });
});