import { query } from '../config/db';
import * as CareerGoalModel from './careerGoal';
import * as LearningPathModel from './learningPath';

/**
 * Dedicated pathway finder data: assembles every discoverable learning pathway
 * (career goals, school paths, category paths) together with the current
 * user's progress and the recommended next step for each pursued pathway.
 */
export async function getPathwayFinderData(userId?: string) {
  const [goals, pursued, schoolPaths, categoryPaths] = await Promise.all([
    CareerGoalModel.getAllCareerGoals(),
    userId ? CareerGoalModel.getMyCareerGoals(userId) : Promise.resolve([]),
    LearningPathModel.getGroupedBySchool(),
    LearningPathModel.getGroupedByCategory(),
  ]);

  const enrolledSet = new Set<string>();
  const completedSet = new Set<string>();
  const pathEnrollments = new Map<string, any>();

  if (userId) {
    const [enrolledRes, completedRes] = await Promise.all([
      query('SELECT course_id FROM enrollments WHERE user_id = $1', [userId]),
      query('SELECT DISTINCT course_id FROM enrollments WHERE user_id = $1 AND completed = true', [userId]),
    ]);
    enrolledRes.rows.forEach((r) => enrolledSet.add(r.course_id));
    completedRes.rows.forEach((r) => completedSet.add(r.course_id));

    const { rows: pathRows } = await query(
      `SELECT lpe.path_id, lpe.progress, lpe.completed, lpe.started_at
       FROM learning_path_enrollments lpe
       WHERE lpe.user_id = $1`,
      [userId]
    );
    pathRows.forEach((r) => pathEnrollments.set(r.path_id, r));
  }

  const annotatePaths = (container: any[], keyOfPath: (zone: any) => string) => {
    for (const group of container) {
      for (const level of ['beginner', 'intermediate', 'advanced']) {
        const zone = group.zones?.[level];
        if (!zone || !zone.path) continue;
        const enrollment = pathEnrollments.get(zone.path.id);
        zone.path = {
          ...zone.path,
          enrolled: !!enrollment,
          progress: enrollment ? Number(enrollment.progress) || 0 : 0,
          pathCompleted: enrollment ? !!enrollment.completed : false,
          started_at: enrollment?.started_at || null,
        };
      }
    }
  };
  annotatePaths(schoolPaths, () => 'x');
  annotatePaths(categoryPaths, () => 'x');

  const pursuedWithNext: any[] = [];
  for (const goal of pursued) {
    const courses = await CareerGoalModel.getCareerGoalCourses(goal.id);
    let nextStep: { courseId: string; title: string; slug: string; thumbnail: string | null; duration: number; phase: string } | null = null;
    let nextInQueue = courses.find((c) => !completedSet.has(c.id));
    let nextEnrolled = courses.find((c) => enrolledSet.has(c.id) && !completedSet.has(c.id));
    const next = nextEnrolled || nextInQueue || null;
    if (next) {
      nextStep = {
        courseId: next.id,
        title: next.title,
        slug: next.slug,
        thumbnail: next.thumbnail,
        duration: next.duration,
        phase: next.phase,
      };
    }
    pursuedWithNext.push({ ...goal, nextStep });
  }

  const pursuedGoalIds = new Set(pursued.map((g) => g.id));
  const discoverableGoals = goals.map((g) => {
    const mine = pursued.find((p) => p.id === g.id);
    return {
      ...g,
      isPursued: !!mine,
      progress: mine ? Number(mine.progress) || 0 : 0,
      completed: mine ? !!mine.completed : false,
      started_at: mine?.started_at || null,
    };
  });

  const completedGoals = pursuedWithNext.filter((g) => g.completed).length;
  const inProgressGoals = pursuedWithNext.length - completedGoals;
  const enrolledPaths = [...pathEnrollments.values()].filter((p) => !p.completed);
  const completedPaths = [...pathEnrollments.values()].filter((p) => p.completed);

  return {
    userId: userId || null,
    summary: {
      totalGoals: goals.length,
      pursuedGoals: pursuedWithNext.length,
      completedGoals,
      inProgressGoals,
      enrolledPathsTotal: pathEnrollments.size,
      inProgressPathways: enrolledPaths.length,
      completedPathways: completedPaths.length,
    },
    pursuedGoals: pursuedWithNext,
    discoverableGoals,
    schoolPaths,
    categoryPaths,
  };
}