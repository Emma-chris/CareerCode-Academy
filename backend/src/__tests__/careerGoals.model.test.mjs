import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

// ───────────── mocked DB (records every query + params) ─────────────

const calls = [];
const returnPlan = [];

mock.module('../config/db.ts', {
  namedExports: {
    query: async (text, params) => {
      calls.push({ text, params });
      if (returnPlan.length > 0) {
        return returnPlan.shift();
      }
      return { rows: [] };
    },
  },
});

const CareerGoalModel = await import('../models/careerGoal.ts');

function reset() {
  calls.length = 0;
  returnPlan.length = 0;
}

const GOAL = '3dd2a9c0-aa0a-4f3a-9e2a-333333333333';
const SCHOOL = '3dd2a9c0-aa0a-4f3a-9e2a-444444444444';
const PATH = '3dd2a9c0-aa0a-4f3a-9e2a-555555555555';
const C1 = '3dd2a9c0-aa0a-4f3a-9e2a-666666666666';
const C2 = '3dd2a9c0-aa0a-4f3a-9e2a-777777777777';

describe('career goal model — get all', () => {
  it('aggregates course count, duration, students and school/path fields', async () => {
    reset();
    returnPlan.push({ rows: [{ slug: 'data-analyst', courses_count: 6, total_duration: 200, students_count: 3, school_name: 'Data' }] });
    const goals = await CareerGoalModel.getAllCareerGoals();
    assert.equal(goals.length, 1);
    assert.equal(goals[0].courses_count, 6);
    const sql = calls[0].text;
    assert.match(sql, /FROM career_goals g/);
    assert.match(sql, /JOIN career_goal_courses gc ON gc\.goal_id = g\.id/);
    assert.match(sql, /s\.name as school_name/);
    assert.match(sql, /lp\.slug as path_slug/);
    assert.match(sql, /WHERE g\.is_active = true/);
    assert.match(sql, /ORDER BY g\.sort_order ASC/);
  });
});

describe('career goal model — get by slug', () => {
  it('returns goal with linked path and school meta', async () => {
    reset();
    returnPlan.push({ rows: [{ id: GOAL, path_slug: 'career-goal-data-analyst', school_name: 'Data' }] });
    const goal = await CareerGoalModel.getCareerGoalBySlug('data-analyst');
    assert.equal(goal.id, GOAL);
    const sql = calls[0].text;
    assert.match(sql, /FROM career_goals g/);
    assert.match(sql, /LEFT JOIN learning_paths lp ON lp\.career_goal_id = g\.id/);
    assert.deepEqual(calls[0].params, ['data-analyst']);
  });

  it('returns null when missing', async () => {
    reset();
    returnPlan.push({ rows: [] });
    const goal = await CareerGoalModel.getCareerGoalBySlug('nope');
    assert.equal(goal, null);
  });
});

describe('career goal model — get career goal courses', () => {
  it('joins course + instructor and orders by bundle index', async () => {
    reset();
    returnPlan.push({ rows: [{ id: C1, phase: 'core', order_index: 2 }] });
    const courses = await CareerGoalModel.getCareerGoalCourses(GOAL);
    assert.equal(courses[0].id, C1);
    const sql = calls[0].text;
    assert.match(sql, /FROM career_goal_courses gc/);
    assert.match(sql, /JOIN users u ON c\.instructor_id = u\.id/);
    assert.match(sql, /ORDER BY gc\.order_index ASC/);
    assert.deepEqual(calls[0].params, [GOAL]);
  });
});

describe('career goal model — get my goals', () => {
  it('returns pursued goals joined through the linked path enrollment', async () => {
    reset();
    returnPlan.push({ rows: [{ slug: 'data-analyst', progress: 40, total_courses: 6, completed_courses: 2 }] });
    const my = await CareerGoalModel.getMyCareerGoals('user-1');
    assert.equal(my.length, 1);
    const sql = calls[0].text;
    assert.match(sql, /FROM career_goals g/);
    assert.match(sql, /JOIN learning_paths lp ON lp\.career_goal_id = g\.id/);
    assert.match(sql, /JOIN learning_path_enrollments lpe ON lpe\.path_id = lp\.id AND lpe\.user_id = \$1/);
    assert.deepEqual(calls[0].params, ['user-1']);
  });
});

describe('career goal model — upsert', () => {
  it('resolves school then inserts a new goal', async () => {
    reset();
    returnPlan.push({ rows: [{ id: SCHOOL }] });        // schools lookup
    returnPlan.push({ rows: [] });                       // no existing
    returnPlan.push({ rows: [{ id: GOAL }] });           // insert
    const id = await CareerGoalModel.upsertCareerGoal({
      slug: 'data-analyst',
      title: 'Become a Data Analyst',
      roleTitle: 'Data Analyst',
      schoolSlug: 'data-ai',
      desiredSkills: ['Python', 'SQL'],
      bundle: [],
    });
    assert.equal(id, GOAL);
    const insert = calls[2];
    assert.match(insert.text, /INSERT INTO career_goals/);
    assert.equal(insert.params[1], 'data-analyst');      // slug
    assert.equal(insert.params[9], SCHOOL);              // school_id
    assert.deepEqual(insert.params[6], ['Python', 'SQL']); // desired_skills
    assert.match(insert.text, /RETURNING id/);
  });

  it('updates an existing goal by slug', async () => {
    reset();
    returnPlan.push({ rows: [{ id: SCHOOL }] });
    returnPlan.push({ rows: [{ id: GOAL }] });
    const id = await CareerGoalModel.upsertCareerGoal({
      slug: 'data-analyst',
      title: 'Become a Data Analyst',
      roleTitle: 'Data Analyst',
      schoolSlug: 'data-ai',
      bundle: [],
    });
    assert.equal(id, GOAL);
    assert.equal(calls.length, 3); // school lookup, existing check, update
    assert.match(calls[2].text, /UPDATE career_goals SET/);
    assert.equal(calls[2].params[10], GOAL);
  });
});

describe('career goal model — set courses', () => {
  it('resolves slugs and rebuilds the ordered bundle', async () => {
    reset();
    returnPlan.push({ rows: [{ id: C1 }] }); // python-for-everybody
    returnPlan.push({ rows: [{ id: C2 }] }); // machine-learning
    await CareerGoalModel.setCareerGoalCourses(GOAL, [
      { courseSlug: 'python-for-everybody', phase: 'foundations' },
      { courseSlug: 'machine-learning', phase: 'core' },
    ]);
    assert.match(calls[0].text, /FROM courses\s+WHERE slug = \$1/);
    assert.deepEqual(calls[1].params, ['machine-learning']);
    assert.match(calls[2].text, /DELETE FROM career_goal_courses WHERE goal_id = \$1/);
    assert.deepEqual(calls[3].params, [GOAL, C1, 0, 'foundations']);
    assert.deepEqual(calls[4].params, [GOAL, C2, 1, 'core']);
  });

  it('throws with a helpful message when a slug cannot be resolved', async () => {
    reset();
    returnPlan.push({ rows: [] });
    await assert.rejects(
      () => CareerGoalModel.setCareerGoalCourses(GOAL, [{ courseSlug: 'not-a-course', phase: 'core' }]),
      /unknown courses: not-a-course/
    );
  });
});

describe('career goal model — sync career goal path', () => {
  it('links goal to a learning_path and rebuilds its courses in order', async () => {
    reset();
    returnPlan.push({ rows: [{ id: GOAL, slug: 'data-analyst', title: 'Become a Data Analyst', summary: null, icon: 'BarChart3', color: 'from-blue-500 to-cyan-600', school_id: SCHOOL }] });
    returnPlan.push({ rows: [{ course_id: C1 }, { course_id: C2 }] });
    returnPlan.push({ rows: [] });                       // no existing path
    returnPlan.push({ rows: [{ id: PATH }] });           // insert path
    const pathId = await CareerGoalModel.syncCareerGoalPath(GOAL);
    assert.equal(pathId, PATH);
    const insert = calls[3];
    assert.match(insert.text, /INSERT INTO learning_paths/);
    assert.equal(insert.params[5], 'career-goal-data-analyst'); // slug
    assert.equal(insert.params[7], GOAL);                       // career_goal_id
    assert.equal(insert.params[6], SCHOOL);                     // school_id
    assert.deepEqual(calls[4].params, [PATH]);                  // DELETE courses
    assert.deepEqual(calls[5].params, [PATH, C1, 0]);
    assert.deepEqual(calls[6].params, [PATH, C2, 1]);
  });

  it('updates the linked path when it already exists', async () => {
    reset();
    returnPlan.push({ rows: [{ id: GOAL, slug: 'data-analyst', title: 'Become a Data Analyst', summary: null, icon: 'BarChart3', color: 'from-blue-500 to-cyan-600', school_id: null }] });
    returnPlan.push({ rows: [{ course_id: C1 }] });
    returnPlan.push({ rows: [{ id: PATH }] });           // existing path
    const pathId = await CareerGoalModel.syncCareerGoalPath(GOAL);
    assert.equal(pathId, PATH);
    assert.match(calls[3].text, /UPDATE learning_paths SET/);
    assert.equal(calls[3].params[7], PATH);
  });

  it('returns null when the goal is missing', async () => {
    reset();
    returnPlan.push({ rows: [] });
    assert.equal(await CareerGoalModel.syncCareerGoalPath(GOAL), null);
  });

  it('returns null when the goal has no bundled courses', async () => {
    reset();
    returnPlan.push({ rows: [{ id: GOAL, slug: 'data-analyst', title: 'Become a Data Analyst' }] });
    returnPlan.push({ rows: [] });
    assert.equal(await CareerGoalModel.syncCareerGoalPath(GOAL), null);
    assert.equal(calls.length, 2);
  });
});