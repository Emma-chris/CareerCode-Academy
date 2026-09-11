# Career Code Academy — Career Pipeline Architecture (S0 Design Pack)

Status: Approved build plan (S0–S6). Scope: layered on the existing marketplace; marketplace unchanged core.

## 1. Corrected User Journey

DISCOVER (trust-first, honest stats, unified currency) →
STAGE 1 LEARN (opted-in Guided Mode loop per career track:
  Check-in → Learn (lesson/video) → Gate quiz (pass ≥80%) → Practice → Feedback → XP/streak;
  Readiness % + days-to-cert; accountability snapshot) →
STAGE 2 PRACTICE & BUILD (Project submissions → mentor review →
  auto portfolio item on approval → public a/u profile with certificates + skills) →
STAGE 3 CAREER (Pathway-matched jobs/internships → in-platform Apply (cover note) →
  pipeline applied → reviewing → interviewing → offered → hired | rejected →
  admin reviews applicants) →
STAGE 4 ALUMNI (auto alumni on pathway completion → outcomes metrics power honest marketing)

## 2. Data Model Additions (migration 014)

- job_applications(id, job_id FK nullable, internship_id FK nullable, user_id FK, cover_note,
  status enum-text 'applied|reviewing|interviewing|offered|hired|rejected', status_timeline jsonb, timestamps)
- jobs.skills text[] , internships.skills text[]  (+ is_approved/is_active flags reused)
- projects(id, user_id, title, description, source_url, demo_url, image_url, skills text[],
  course_id nullable, status 'draft|submitted|approved|rejected', reviewer_id, feedback, timestamps)
- portfolio_items(id, user_id, project_id nullable FK, title, description, url, image_url,
  skills text[], is_public bool, timestamps)
- guided_enrollments(id, user_id, path_id FK, mode 'off|active|paused', day_index int, start_date)
- guided_loop_entries(id, guided_enrollment_id, day_index, course_id, lesson_id, state jsonb,
  completed bool, completed_at)
- daily_checkins(id, user_id, checkin_date, productive, energy, rating, improve, unclear,
  blocks_completed int, claimed bool)
- alumni: auto-flag on pathway completion (existing table)

## 3. API Surface

Career (extended):
- GET    /career/jobs, /career/internships  (public, unchanged)
- POST/PUT/DELETE /career/admin/jobs|/internships/:id  (admin)
- POST   /career/jobs/:id/apply, /career/internships/:id/apply  (student, cover_note)
- GET    /career/applications/mine
- GET    /career/admin/applications  (admin, filterable)
- PATCH  /career/admin/applications/:id  (admin: status, note)
- GET    /career/match  (student: matched roles from completed tracks/skills)

Portfolio (new, /api/v1/portfolio):
- GET    /portfolio/:username  (public profile: bio, skills, certs, items)
- GET/POST /portfolio  (own), PUT/DELETE /portfolio/:id
- POST   /portfolio/projects (submit project), GET /portfolio/projects (own), GET /portfolio/projects/:id
- POST   /portfolio/projects/:id/review  (instructor/admin → auto portfolio_item on approve)

Guided (new, /api/v1/guided):
- POST   /guided/enroll {pathSlug or pathId}
- GET    /guided/today  (day plan: lesson + required quiz + challenge)
- POST   /guided/get-quiz {lessonId} → gate quiz payload; POST /guided/lesson-complete {lessonId} (checks gate passed)
- POST   /guided/checkin
- GET    /guided/readiness, GET /guided/accountability

Public:
- GET    /public/stats  (real counts: students, courses, certificates, alumni — powers honest marketing)

Outcomes (admin):
- GET    /career/admin/outcomes (application funnel + alumni/hires aggregate)

## 4. Page Map (frontend)

- /student/applications         ← My Applications (pipeline status timeline)
- /u/:username                  ← public learner profile (certs + portfolio + skills)
- /student/portfolio            ← manage portfolio items + submit projects
- /student/guided/:slug         ← Guided Mode daily loop
- /admin/career                 ← Jobs/Internships CRUD + applications review + outcomes
- JobBoard.tsx / InternshipsPage.tsx  ← in-platform Apply modal (replaces external-only link)

## 5. Tie-ins & Integrity

- celebrateCompletedLearningPaths() → upsert alumni (S6) 
- Certificate + pathway completion → eligibility + matching input
- Currency: all catalog surfaces render via formatCurrency + platform currency (S1)
- Marketing: /public/stats replaces 95%-placement/500-partners fabrications (S6)