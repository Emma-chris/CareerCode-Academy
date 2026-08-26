import { query } from './config/db';

const schools = [
  {
    name: 'School of Software Development',
    slug: 'software-development',
    description: 'Focused on preparing students for careers in software engineering and application development.',
    icon: 'Code2',
    color: 'from-blue-600 to-cyan-600',
    sort_order: 1,
    programs: [
      {
        name: 'Frontend Development',
        slug: 'frontend-development',
        description: 'Build modern, responsive web interfaces using React, TypeScript, and modern CSS frameworks. Master component architecture, state management, and API integration.',
        duration: '16 weeks',
        icon: 'Code2',
        sort_order: 1,
        career_outcomes: ['Frontend Developer', 'UI Engineer', 'React Developer', 'Web Developer'],
        course_slugs: ['responsive-web-design', 'front-end-development-libraries', 'javascript-algorithms-data-structures'],
      },
      {
        name: 'Backend Development',
        slug: 'backend-development',
        description: 'Design and build scalable server-side applications, RESTful APIs, and database systems using Node.js, Python, and cloud technologies.',
        duration: '16 weeks',
        icon: 'Database',
        sort_order: 2,
        career_outcomes: ['Backend Developer', 'API Engineer', 'Server-Side Developer', 'Database Administrator'],
        course_slugs: ['back-end-development-apis', 'database-systems-sql', 'relational-database', 'python-for-everybody'],
      },
      {
        name: 'Full Stack Development',
        slug: 'full-stack-development',
        description: 'Become a versatile developer capable of building complete web applications from frontend to backend, database, and deployment.',
        duration: '24 weeks',
        icon: 'Code2',
        sort_order: 3,
        career_outcomes: ['Full Stack Engineer', 'Software Engineer', 'Web Developer', 'Technical Lead'],
        course_slugs: ['full-stack-web-development', 'software-engineering-design-patterns', 'git-version-control-mastery'],
      },
      {
        name: 'Mobile App Development',
        slug: 'mobile-app-development',
        description: 'Create native and cross-platform mobile applications using React Native, Flutter, and modern mobile development practices.',
        duration: '16 weeks',
        icon: 'Code2',
        sort_order: 4,
        career_outcomes: ['Mobile Developer', 'React Native Developer', 'Flutter Developer', 'iOS/Android Developer'],
        course_slugs: ['mobile-app-development'],
      },
      {
        name: 'DevOps Engineering',
        slug: 'devops-engineering',
        description: 'Learn CI/CD pipelines, containerization, cloud infrastructure, monitoring, and automation to streamline software delivery.',
        duration: '12 weeks',
        icon: 'Code2',
        sort_order: 5,
        career_outcomes: ['DevOps Engineer', 'Cloud Engineer', 'Site Reliability Engineer', 'Platform Engineer'],
        course_slugs: ['docker-kubernetes-mastery', 'ci-cd-pipeline-engineering', 'cloud-computing-with-aws'],
      },
      {
        name: 'Cybersecurity',
        slug: 'cybersecurity',
        description: 'Protect systems and networks from digital attacks. Learn threat analysis, penetration testing, security auditing, and incident response.',
        duration: '16 weeks',
        icon: 'Shield',
        sort_order: 6,
        career_outcomes: ['Security Analyst', 'Penetration Tester', 'Security Engineer', 'Cybersecurity Specialist'],
        course_slugs: ['cybersecurity', 'computer-networks-security', 'information-security', 'digital-forensics-incident-response', 'cloud-security-devsecops'],
      },
      {
        name: 'Cloud Computing',
        slug: 'cloud-computing',
        description: 'Master cloud architecture on AWS, Azure, and GCP. Learn infrastructure as code, serverless computing, and cloud-native design patterns.',
        duration: '12 weeks',
        icon: 'Cloud',
        sort_order: 7,
        career_outcomes: ['Cloud Architect', 'Cloud Developer', 'Solutions Architect', 'Cloud Consultant'],
        course_slugs: ['cloud-computing-with-aws', 'docker-kubernetes-mastery'],
      },
    ],
  },
  {
    name: 'School of Data & Artificial Intelligence',
    slug: 'data-ai',
    description: 'Focused on data-driven careers and emerging technologies.',
    icon: 'Database',
    color: 'from-purple-600 to-pink-600',
    sort_order: 2,
    programs: [
      {
        name: 'Data Analysis',
        slug: 'data-analysis',
        description: 'Learn to collect, clean, analyze, and visualize data using Python, SQL, and industry-standard tools to drive business decisions.',
        duration: '12 weeks',
        icon: 'Database',
        sort_order: 1,
        career_outcomes: ['Data Analyst', 'Business Analyst', 'Data Visualization Specialist', 'Analytics Manager'],
        course_slugs: ['python-for-everybody', 'scientific-computing-with-python', 'data-visualization', 'college-algebra-with-python'],
      },
      {
        name: 'Data Science',
        slug: 'data-science',
        description: 'Dive deep into statistical modeling, machine learning, and predictive analytics. Build data pipelines and deploy models to production.',
        duration: '16 weeks',
        icon: 'Database',
        sort_order: 2,
        career_outcomes: ['Data Scientist', 'Data Analyst', 'Machine Learning Engineer', 'Research Scientist'],
        course_slugs: ['machine-learning', 'python-for-everybody', 'scientific-computing-with-python'],
      },
      {
        name: 'Machine Learning',
        slug: 'machine-learning',
        description: 'Master supervised and unsupervised learning, neural networks, NLP, and computer vision. Build and deploy ML models at scale.',
        duration: '16 weeks',
        icon: 'Database',
        sort_order: 3,
        career_outcomes: ['Machine Learning Engineer', 'AI Engineer', 'MLOps Engineer', 'Data Scientist'],
        course_slugs: ['machine-learning', 'python-for-everybody'],
      },
      {
        name: 'Artificial Intelligence',
        slug: 'artificial-intelligence',
        description: 'Explore deep learning, reinforcement learning, generative AI, and LLMs. Build intelligent systems that solve real-world problems.',
        duration: '20 weeks',
        icon: 'Database',
        sort_order: 4,
        career_outcomes: ['AI Engineer', 'AI Researcher', 'NLP Engineer', 'Computer Vision Engineer'],
        course_slugs: ['artificial-intelligence', 'machine-learning'],
      },
      {
        name: 'Business Intelligence',
        slug: 'business-intelligence',
        description: 'Transform raw data into actionable insights. Learn data warehousing, ETL processes, dashboard creation, and reporting tools.',
        duration: '12 weeks',
        icon: 'Database',
        sort_order: 5,
        career_outcomes: ['Business Intelligence Analyst', 'BI Developer', 'Data Analyst', 'Reporting Specialist'],
        course_slugs: ['data-visualization', 'database-systems-sql'],
      },
    ],
  },
  {
    name: 'School of Design & Creative Technology',
    slug: 'design-creative',
    description: 'Focused on creating digital experiences and visual communication.',
    icon: 'Palette',
    color: 'from-rose-600 to-orange-600',
    sort_order: 3,
    programs: [
      {
        name: 'UI/UX Design',
        slug: 'ui-ux-design',
        description: 'Design intuitive and beautiful user interfaces. Master user research, wireframing, prototyping, and usability testing.',
        duration: '14 weeks',
        icon: 'Palette',
        sort_order: 1,
        career_outcomes: ['UI/UX Designer', 'UX Researcher', 'Product Designer', 'Interaction Designer'],
        course_slugs: ['ui-ux-design-fundamentals', 'responsive-web-design'],
      },
      {
        name: 'Product Design',
        slug: 'product-design',
        description: 'Design digital products from concept to launch. Learn design thinking, user-centered design, and cross-functional collaboration.',
        duration: '16 weeks',
        icon: 'Palette',
        sort_order: 2,
        career_outcomes: ['Product Designer', 'Senior UX Designer', 'Design Lead', 'Design Strategist'],
        course_slugs: ['ui-ux-design-fundamentals', 'software-engineering-design-patterns'],
      },
      {
        name: 'Graphic Design',
        slug: 'graphic-design',
        description: 'Create compelling visual content for digital and print media. Master typography, color theory, layout, and brand identity.',
        duration: '12 weeks',
        icon: 'Palette',
        sort_order: 3,
        career_outcomes: ['Graphic Designer', 'Visual Designer', 'Brand Designer', 'Creative Designer'],
        course_slugs: ['graphic-design-with-figma', 'responsive-web-design'],
      },
      {
        name: 'Motion Design',
        slug: 'motion-design',
        description: 'Bring designs to life through animation and motion graphics. Learn After Effects, Lottie, and web animation techniques.',
        duration: '12 weeks',
        icon: 'Palette',
        sort_order: 4,
        career_outcomes: ['Motion Designer', 'Animation Artist', 'Video Editor', 'Creative Technologist'],
        course_slugs: ['graphic-design-with-figma'],
      },
      {
        name: 'Brand Identity Design',
        slug: 'brand-identity-design',
        description: 'Build cohesive brand identities from strategy to execution. Learn logo design, brand guidelines, and visual storytelling.',
        duration: '10 weeks',
        icon: 'Palette',
        sort_order: 5,
        career_outcomes: ['Brand Designer', 'Identity Designer', 'Creative Director', 'Art Director'],
        course_slugs: ['graphic-design-with-figma'],
      },
    ],
  },
  {
    name: 'School of Business & Digital Careers',
    slug: 'business-digital',
    description: 'Focused on modern business and digital economy skills.',
    icon: 'Briefcase',
    color: 'from-emerald-600 to-teal-600',
    sort_order: 4,
    programs: [
      {
        name: 'Digital Marketing',
        slug: 'digital-marketing',
        description: 'Master SEO, SEM, social media marketing, email marketing, and analytics. Drive growth through data-driven marketing strategies.',
        duration: '12 weeks',
        icon: 'Briefcase',
        sort_order: 1,
        career_outcomes: ['Digital Marketer', 'SEO Specialist', 'Social Media Manager', 'Marketing Analyst'],
        course_slugs: ['data-visualization', 'responsive-web-design'],
      },
      {
        name: 'Product Management',
        slug: 'product-management',
        description: 'Lead product strategy from ideation to launch. Learn roadmapping, user stories, sprint planning, and stakeholder management.',
        duration: '12 weeks',
        icon: 'Briefcase',
        sort_order: 2,
        career_outcomes: ['Product Manager', 'Product Owner', 'Technical Product Manager', 'Growth Product Manager'],
        course_slugs: ['software-engineering-design-patterns', 'quality-assurance'],
      },
      {
        name: 'Project Management',
        slug: 'project-management',
        description: 'Manage projects effectively using Agile, Scrum, and Waterfall methodologies. Master budgeting, scheduling, and team coordination.',
        duration: '10 weeks',
        icon: 'Briefcase',
        sort_order: 3,
        career_outcomes: ['Project Manager', 'Scrum Master', 'Agile Coach', 'Program Manager'],
        course_slugs: ['git-version-control-mastery', 'quality-assurance'],
      },
      {
        name: 'Virtual Assistance',
        slug: 'virtual-assistance',
        description: 'Provide administrative, technical, and creative support remotely. Learn tools, time management, and client communication.',
        duration: '8 weeks',
        icon: 'Briefcase',
        sort_order: 4,
        career_outcomes: ['Virtual Assistant', 'Executive Assistant', 'Administrative Support Specialist', 'Remote Operations Coordinator'],
        course_slugs: ['git-version-control-mastery'],
      },
      {
        name: 'Customer Success',
        slug: 'customer-success',
        description: 'Drive customer retention and growth. Learn onboarding, account management, support strategies, and customer health monitoring.',
        duration: '10 weeks',
        icon: 'Briefcase',
        sort_order: 5,
        career_outcomes: ['Customer Success Specialist', 'Account Manager', 'Customer Support Lead', 'Client Success Manager'],
        course_slugs: ['quality-assurance'],
      },
      {
        name: 'Content Creation',
        slug: 'content-creation',
        description: 'Create engaging content for blogs, social media, video, and podcasts. Master storytelling, copywriting, and content strategy.',
        duration: '10 weeks',
        icon: 'Briefcase',
        sort_order: 6,
        career_outcomes: ['Content Creator', 'Copywriter', 'Content Strategist', 'Social Media Content Specialist'],
        course_slugs: ['graphic-design-with-figma'],
      },
    ],
  },
  {
    name: 'School of Career Readiness',
    slug: 'career-readiness',
    description: 'Focused on preparing students for employment and professional success.',
    icon: 'GraduationCap',
    color: 'from-amber-600 to-yellow-600',
    sort_order: 5,
    programs: [
      {
        name: 'CV & Resume Development',
        slug: 'cv-resume-development',
        description: 'Craft compelling resumes and CVs that stand out to employers and ATS systems. Learn formatting, keyword optimization, and achievement highlighting.',
        duration: '4 weeks',
        icon: 'GraduationCap',
        sort_order: 1,
        career_outcomes: ['Improved Employability', 'Interview Invitations', 'Professional Branding'],
        course_slugs: [],
      },
      {
        name: 'LinkedIn Optimization',
        slug: 'linkedin-optimization',
        description: 'Transform your LinkedIn profile into a powerful networking and job-seeking tool. Learn profile optimization, content strategy, and networking techniques.',
        duration: '4 weeks',
        icon: 'GraduationCap',
        sort_order: 2,
        career_outcomes: ['Improved Employability', 'Networking Opportunities', 'Personal Branding'],
        course_slugs: [],
      },
      {
        name: 'Interview Preparation',
        slug: 'interview-preparation',
        description: 'Ace your interviews with confidence. Master behavioral questions, technical interviews, case studies, and negotiation strategies.',
        duration: '6 weeks',
        icon: 'GraduationCap',
        sort_order: 3,
        career_outcomes: ['Improved Employability', 'Job Offers', 'Career Advancement'],
        course_slugs: ['coding-interview-prep', 'data-structures-algorithms', 'javascript-algorithms-data-structures'],
      },
      {
        name: 'Personal Branding',
        slug: 'personal-branding',
        description: 'Build a powerful personal brand that opens doors. Learn to define your unique value proposition and communicate it across platforms.',
        duration: '6 weeks',
        icon: 'GraduationCap',
        sort_order: 4,
        career_outcomes: ['Personal Branding', 'Freelancing Opportunities', 'Thought Leadership'],
        course_slugs: [],
      },
      {
        name: 'Freelancing Mastery',
        slug: 'freelancing-mastery',
        description: 'Launch and grow a successful freelancing career. Learn client acquisition, pricing, contracts, project management, and scaling your business.',
        duration: '8 weeks',
        icon: 'GraduationCap',
        sort_order: 5,
        career_outcomes: ['Freelancing Opportunities', 'Remote Job Readiness', 'Entrepreneurship'],
        course_slugs: [],
      },
      {
        name: 'Remote Work Readiness',
        slug: 'remote-work-readiness',
        description: 'Thrive in remote work environments. Master async communication, time management, self-discipline, and remote collaboration tools.',
        duration: '4 weeks',
        icon: 'GraduationCap',
        sort_order: 6,
        career_outcomes: ['Remote Job Readiness', 'Improved Employability', 'Digital Collaboration Skills'],
        course_slugs: [],
      },
    ],
  },
];

async function seedSchools() {
  try {
    for (const school of schools) {
      const existing = await query('SELECT id FROM schools WHERE slug = $1', [school.slug]);
      let schoolId: string;

      if (existing.rows.length > 0) {
        schoolId = existing.rows[0].id;
        await query(
          `UPDATE schools SET name = $1, description = $2, icon = $3, color = $4, sort_order = $5, updated_at = NOW() WHERE id = $6`,
          [school.name, school.description, school.icon, school.color, school.sort_order, schoolId]
        );
        console.log(`Updated school: ${school.name}`);
      } else {
        const ins = await query(
          `INSERT INTO schools (name, slug, description, icon, color, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [school.name, school.slug, school.description, school.icon, school.color, school.sort_order]
        );
        schoolId = ins.rows[0].id;
        console.log(`Created school: ${school.name}`);
      }

      for (const program of school.programs) {
        const existingProg = await query('SELECT id FROM programs WHERE slug = $1', [program.slug]);
        let programId: string;

        if (existingProg.rows.length > 0) {
          programId = existingProg.rows[0].id;
          await query(
            `UPDATE programs SET name = $1, description = $2, duration = $3, icon = $4, sort_order = $5, career_outcomes = $6, school_id = $7, updated_at = NOW() WHERE slug = $8`,
            [program.name, program.description, program.duration, program.icon, program.sort_order, program.career_outcomes, schoolId, program.slug]
          );
          console.log(`  Updated program: ${program.name}`);
        } else {
          const ins = await query(
            `INSERT INTO programs (school_id, name, slug, description, duration, icon, sort_order, career_outcomes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [schoolId, program.name, program.slug, program.description, program.duration, program.icon, program.sort_order, program.career_outcomes]
          );
          programId = ins.rows[0].id;
          console.log(`  Created program: ${program.name}`);
        }

        // Link courses to program and set main course
        let mainCourseId: string | null = null;
        if (program.course_slugs.length > 0) {
          await query('DELETE FROM program_courses WHERE program_id = $1', [programId]);

          for (let i = 0; i < program.course_slugs.length; i++) {
            const slug = program.course_slugs[i];
            const courseRes = await query('SELECT id FROM courses WHERE slug = $1', [slug]);
            if (courseRes.rows.length > 0) {
              await query(
                `INSERT INTO program_courses (program_id, course_id, order_index)
                 VALUES ($1, $2, $3)
                 ON CONFLICT DO NOTHING`,
                [programId, courseRes.rows[0].id, i]
              );
              if (i === 0) {
                mainCourseId = courseRes.rows[0].id;
              }
            }
          }
          console.log(`    Linked ${program.course_slugs.length} courses`);
        }

        await query(
          `UPDATE programs SET main_course_id = $1 WHERE id = $2`,
          [mainCourseId, programId]
        );
      }
    }

    console.log('\nSchools and programs seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed schools:', error);
    process.exit(1);
  }
}

seedSchools();
