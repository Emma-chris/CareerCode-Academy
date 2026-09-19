import dotenv from 'dotenv';
dotenv.config();

import { query } from './config/db';
import {
  upsertCareerGoal,
  setCareerGoalCourses,
  syncCareerGoalPath,
  CareerGoalSpec,
} from './models/careerGoal';

// Curated bundles reference the seeded catalog by course slug (slugify(title) fallback applies).
const goals: CareerGoalSpec[] = [
  // ───────────────── School of Software Development ─────────────────
  {
    slug: 'frontend-developer',
    title: 'Become a Frontend Developer',
    roleTitle: 'Frontend Developer',
    summary: 'Master HTML/CSS, JavaScript and modern frontend libraries, then ship your reach as a portfolio-grade frontend engineer.',
    icon: 'LayoutDashboard',
    color: 'from-sky-500 to-indigo-600',
    schoolSlug: 'software-development',
    salaryBand: '$95K',
    durationEstimate: '6-12 months',
    desiredSkills: ['HTML/CSS', 'JavaScript', 'React', 'Responsive Design', 'Git'],
    sortOrder: 1,
    bundle: [
      { courseSlug: 'responsive-web-design', phase: 'foundations' },
      { courseSlug: 'javascript-algorithms-data-structures', phase: 'core' },
      { courseSlug: 'front-end-development-libraries', phase: 'core' },
      { courseSlug: 'full-stack-web-development', phase: 'build' },
      { courseSlug: 'git-version-control-mastery', phase: 'build' },
      { courseSlug: 'coding-interview-prep', phase: 'hire' },
    ],
  },
  {
    slug: 'backend-developer',
    title: 'Become a Backend Developer',
    roleTitle: 'Backend Developer',
    summary: 'Build scalable server-side systems with Node.js, SQL and clean architecture, and launch them with Docker and Git.',
    icon: 'Server',
    color: 'from-slate-600 to-gray-800',
    schoolSlug: 'software-development',
    salaryBand: '$95K',
    durationEstimate: '6-12 months',
    desiredSkills: ['Node.js', 'REST APIs', 'SQL', 'Clean Architecture', 'Docker'],
    sortOrder: 2,
    bundle: [
      { courseSlug: 'git-version-control-mastery', phase: 'foundations' },
      { courseSlug: 'back-end-development-apis', phase: 'core' },
      { courseSlug: 'database-systems-sql', phase: 'core' },
      { courseSlug: 'relational-database', phase: 'core' },
      { courseSlug: 'software-engineering-design-patterns', phase: 'build' },
      { courseSlug: 'docker-kubernetes-mastery', phase: 'build' },
      { courseSlug: 'coding-interview-prep', phase: 'hire' },
    ],
  },
  {
    slug: 'full-stack-engineer',
    title: 'Become a Full-Stack Engineer',
    roleTitle: 'Full-Stack Engineer',
    summary: 'Span the entire stack — frontend, backend, databases and deployment — to ship complete applications end to end.',
    icon: 'Layers',
    color: 'from-indigo-500 to-purple-600',
    schoolSlug: 'software-development',
    salaryBand: '$95K',
    durationEstimate: '6-12 months',
    desiredSkills: ['JavaScript', 'React', 'Node.js', 'SQL', 'Docker', 'Testing'],
    sortOrder: 3,
    bundle: [
      { courseSlug: 'git-version-control-mastery', phase: 'foundations' },
      { courseSlug: 'responsive-web-design', phase: 'core' },
      { courseSlug: 'javascript-algorithms-data-structures', phase: 'core' },
      { courseSlug: 'back-end-development-apis', phase: 'core' },
      { courseSlug: 'full-stack-web-development', phase: 'build' },
      { courseSlug: 'database-systems-sql', phase: 'build' },
      { courseSlug: 'docker-kubernetes-mastery', phase: 'build' },
      { courseSlug: 'quality-assurance', phase: 'hire' },
      { courseSlug: 'coding-interview-prep', phase: 'hire' },
    ],
  },
  {
    slug: 'mobile-developer',
    title: 'Become a Mobile Developer',
    roleTitle: 'Mobile Developer',
    summary: 'Build cross-platform mobile apps with React Native and ship them to the App Store and Google Play.',
    icon: 'Smartphone',
    color: 'from-fuchsia-500 to-pink-600',
    schoolSlug: 'software-development',
    salaryBand: '$95K',
    durationEstimate: '6-12 months',
    desiredSkills: ['React Native', 'JavaScript', 'App Deployment', 'Git'],
    sortOrder: 4,
    bundle: [
      { courseSlug: 'git-version-control-mastery', phase: 'foundations' },
      { courseSlug: 'mobile-app-development', phase: 'core' },
      { courseSlug: 'full-stack-web-development', phase: 'build' },
      { courseSlug: 'front-end-development-libraries', phase: 'build' },
      { courseSlug: 'coding-interview-prep', phase: 'hire' },
    ],
  },
  {
    slug: 'devops-engineer',
    title: 'Become a DevOps Engineer',
    roleTitle: 'DevOps Engineer',
    summary: 'Automate infrastructure, containerize applications and run pipelines that take code from commit to cloud reliably.',
    icon: 'Boxes',
    color: 'from-amber-500 to-orange-600',
    schoolSlug: 'software-development',
    salaryBand: '$95K',
    durationEstimate: '6-12 months',
    desiredSkills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Cloud Security'],
    sortOrder: 5,
    bundle: [
      { courseSlug: 'git-version-control-mastery', phase: 'foundations' },
      { courseSlug: 'network-administration', phase: 'foundations' },
      { courseSlug: 'cloud-computing-with-aws', phase: 'core' },
      { courseSlug: 'docker-kubernetes-mastery', phase: 'core' },
      { courseSlug: 'ci-cd-pipeline-engineering', phase: 'build' },
      { courseSlug: 'cloud-security-devsecops', phase: 'build' },
      { courseSlug: 'coding-interview-prep', phase: 'hire' },
    ],
  },
  {
    slug: 'cybersecurity-analyst',
    title: 'Become a Cybersecurity Analyst',
    roleTitle: 'Cybersecurity Analyst',
    summary: 'Protect systems and data — master networking, security operations, forensics and modern defensive tooling.',
    icon: 'ShieldCheck',
    color: 'from-emerald-500 to-teal-600',
    schoolSlug: 'software-development',
    salaryBand: '$95K',
    durationEstimate: '6-12 months',
    desiredSkills: ['Network Security', 'Ethical Hacking', 'Forensics', 'Incident Response'],
    sortOrder: 6,
    bundle: [
      { courseSlug: 'network-administration', phase: 'foundations' },
      { courseSlug: 'computer-networks-security', phase: 'core' },
      { courseSlug: 'information-security', phase: 'core' },
      { courseSlug: 'digital-forensics-incident-response', phase: 'build' },
      { courseSlug: 'cybersecurity', phase: 'build' },
      { courseSlug: 'cloud-security-devsecops', phase: 'hire' },
    ],
  },

  // ───────────────── School of Data & Artificial Intelligence ─────────────────
  {
    slug: 'data-analyst',
    title: 'Become a Data Analyst',
    roleTitle: 'Data Analyst',
    summary: 'Turn raw data into decisions — Python, statistics, visualization and SQL for practical business analysis.',
    icon: 'BarChart3',
    color: 'from-blue-500 to-cyan-600',
    schoolSlug: 'data-ai',
    salaryBand: '$110K',
    durationEstimate: '6-12 months',
    desiredSkills: ['Python', 'Data Visualization', 'SQL', 'Statistics'],
    sortOrder: 1,
    bundle: [
      { courseSlug: 'python-for-everybody', phase: 'foundations' },
      { courseSlug: 'college-algebra-with-python', phase: 'foundations' },
      { courseSlug: 'scientific-computing-with-python', phase: 'core' },
      { courseSlug: 'data-visualization', phase: 'build' },
      { courseSlug: 'database-systems-sql', phase: 'build' },
      { courseSlug: 'relational-database', phase: 'build' },
    ],
  },
  {
    slug: 'data-scientist',
    title: 'Become a Data Scientist',
    roleTitle: 'Data Scientist',
    summary: 'Model the world with data — combine Python, statistics, machine learning and visualization for real impact.',
    icon: 'FlaskConical',
    color: 'from-teal-500 to-emerald-600',
    schoolSlug: 'data-ai',
    salaryBand: '$110K',
    durationEstimate: '6-12 months',
    desiredSkills: ['Python', 'Machine Learning', 'Statistics', 'SQL'],
    sortOrder: 2,
    bundle: [
      { courseSlug: 'python-for-everybody', phase: 'foundations' },
      { courseSlug: 'college-algebra-with-python', phase: 'foundations' },
      { courseSlug: 'scientific-computing-with-python', phase: 'core' },
      { courseSlug: 'machine-learning', phase: 'core' },
      { courseSlug: 'data-visualization', phase: 'build' },
      { courseSlug: 'database-systems-sql', phase: 'build' },
      { courseSlug: 'coding-interview-prep', phase: 'hire' },
    ],
  },
  {
    slug: 'machine-learning-engineer',
    title: 'Become a Machine Learning Engineer',
    roleTitle: 'Machine Learning Engineer',
    summary: 'Design and deploy ML systems — from models in Python to productionized data pipelines.',
    icon: 'BrainCircuit',
    color: 'from-cyan-500 to-blue-600',
    schoolSlug: 'data-ai',
    salaryBand: '$110K',
    durationEstimate: '6-12 months',
    desiredSkills: ['Python', 'Machine Learning', 'Docker', 'Data Pipelines'],
    sortOrder: 3,
    bundle: [
      { courseSlug: 'python-for-everybody', phase: 'foundations' },
      { courseSlug: 'scientific-computing-with-python', phase: 'core' },
      { courseSlug: 'machine-learning', phase: 'core' },
      { courseSlug: 'data-visualization', phase: 'build' },
      { courseSlug: 'docker-kubernetes-mastery', phase: 'build' },
      { courseSlug: 'coding-interview-prep', phase: 'hire' },
    ],
  },
  {
    slug: 'ai-engineer',
    title: 'Become an AI Engineer',
    roleTitle: 'AI Engineer',
    summary: 'Build intelligent applications — go deep on machine learning, neural networks and applied artificial intelligence.',
    icon: 'Brain',
    color: 'from-violet-500 to-purple-600',
    schoolSlug: 'data-ai',
    salaryBand: '$110K',
    durationEstimate: '6-12 months',
    desiredSkills: ['Artificial Intelligence', 'Machine Learning', 'Python', 'Deep Learning'],
    sortOrder: 4,
    bundle: [
      { courseSlug: 'python-for-everybody', phase: 'foundations' },
      { courseSlug: 'college-algebra-with-python', phase: 'foundations' },
      { courseSlug: 'machine-learning', phase: 'core' },
      { courseSlug: 'artificial-intelligence', phase: 'core' },
      { courseSlug: 'data-visualization', phase: 'build' },
      { courseSlug: 'docker-kubernetes-mastery', phase: 'build' },
      { courseSlug: 'coding-interview-prep', phase: 'hire' },
    ],
  },

  // ───────────────── School of Design & Creative Technology ─────────────────
  {
    slug: 'ui-ux-designer',
    title: 'Become a UI/UX Designer',
    roleTitle: 'UI/UX Designer',
    summary: 'Design the products people love — craft user research, wireframes and polished interfaces in Figma.',
    icon: 'Palette',
    color: 'from-rose-500 to-pink-600',
    schoolSlug: 'design-creative',
    salaryBand: '$85K',
    durationEstimate: '6-12 months',
    desiredSkills: ['UI Design', 'UX Research', 'Figma', 'Design Systems'],
    sortOrder: 1,
    bundle: [
      { courseSlug: 'ui-ux-design-fundamentals', phase: 'foundations' },
      { courseSlug: 'graphic-design-with-figma', phase: 'core' },
      { courseSlug: 'responsive-web-design', phase: 'build' },
      { courseSlug: 'front-end-development-libraries', phase: 'build' },
    ],
  },
  {
    slug: 'product-designer',
    title: 'Become a Product Designer',
    roleTitle: 'Product Designer',
    summary: 'Own the end-to-end product experience — from discovery and prototyping to handoff-ready designs.',
    icon: 'PenTool',
    color: 'from-orange-500 to-amber-600',
    schoolSlug: 'design-creative',
    salaryBand: '$85K',
    durationEstimate: '6-12 months',
    desiredSkills: ['Product Thinking', 'Figma', 'Prototyping', 'UI Design'],
    sortOrder: 2,
    bundle: [
      { courseSlug: 'ui-ux-design-fundamentals', phase: 'foundations' },
      { courseSlug: 'graphic-design-with-figma', phase: 'core' },
      { courseSlug: 'responsive-web-design', phase: 'build' },
    ],
  },
];

async function seedCareerGoals() {
  for (let i = 0; i < goals.length; i++) {
    const goal = goals[i];
    const goalId = await upsertCareerGoal({ ...goal, sortOrder: goal.sortOrder ?? i });
    await setCareerGoalCourses(goalId, goal.bundle);
    const pathId = await syncCareerGoalPath(goalId);
    const courseCount = goal.bundle.length;
    console.log(`✓ "${goal.title}" — ${courseCount} courses${pathId ? ' · linked path' : ' · NO PATH'}`);
  }
}

async function verify() {
  const { rows } = await query(
    `SELECT g.slug, COUNT(gc.course_id)::int as courses,
            (SELECT COUNT(*)::int FROM learning_path_courses lpc JOIN learning_paths lp ON lp.id = lpc.path_id WHERE lp.career_goal_id = g.id) as path_courses
     FROM career_goals g
     LEFT JOIN career_goal_courses gc ON gc.goal_id = g.id
     GROUP BY g.id
     ORDER BY g.sort_order`
  );
  console.log('\nCareer goals summary:');
  for (const row of rows) {
    console.log(`  ${row.slug}: ${row.courses} bundle courses / ${row.path_courses} path courses`);
  }
  process.exit(0);
}

seedCareerGoals().then(verify).catch((error) => {
  console.error('Failed to seed career goals:', error);
  process.exit(1);
});