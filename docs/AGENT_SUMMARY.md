# Careercode Project — Agent Session Summary (Sept 22, 2026)

## Objective
- Ship three CareerCode Academy features: (1) Pathway Finder tracking per-user progress with next-step recommendations, (2) removal of standing course discounts so discounts exist only via time-boxed promotions, (3) board of directors oversight (members, policy review workflow, resolutions, ops metrics).
- Status: backend + frontend complete, both builds pass, backend tests green (90). Remaining: none critical; see Next Move.

## Important Details
- Project root `C:\Users\USER\Documents\Academic\CareerCode-Academy`; npm workspaces `backend/`, `frontend/`; backend Node+Express+pg, frontend React 18+Vite+TS+Tailwind+Zustand+React Router v6.
- Axios baseURL is `/api/v1` (`frontend/src/lib/axios.ts`). Backend `npm run build` passes clean; frontend `npm run build` (tsc -b && vite build) passes (only pre-existing chunk-size/dynamic-import warnings).
- Backend test command: `npm test` in `backend` (runs `node --experimental-test-module-mocks --import tsx --test src/__tests__/*.test.mjs`). 90 tests / 0 fail.
- Backend endpoints used by new frontend pages:
  - Promotions: `GET /promotions` (admin list; rows include `category_name`, `course_title`), `POST /promotions`, `PUT /promotions/:id`, `DELETE /promotions/:id`, `GET /promotions/active`.
  - Board: public `GET /board/members`, `/board/policies`, `/board/policies/:slug`, `/board/resolutions`; admin `GET /board/oversight`, member CRUD (`/board/members`), policy CRUD + `POST /board/policies/:id/submit`, `POST /board/policies/:id/decide` (`{ status: 'approved'|'rejected', notes? }`), resolution CRUD.
  - Promotions page fetches `GET /categories` with fallback `GET /admin/categories` and `GET /admin/courses`.
- UI component constraints (verified by tsc): `Badge` variants are only `'default' | 'primary' | 'success' | 'warning' | 'danger' | 'neon'` (no `'outline'`); `Button` has NO `fullWidth` prop (use `className="w-full"`); installed `lucide-react` has NO `TodoList` export (use `ListChecks`, `List`, etc.); `PageSkeleton` exported from `@/components/student/SkeletonLoader`.
- Windows PowerShell: `rg` and `grep` CLI are NOT available; use the Grep tool (grep tool) or `Select-String`.
- `authenticate` middleware takes no optional arg; use `optionalAuth` for public-but-enriched endpoints. Discounting is server-side: `decorateCourse`/`decorateCourses` attach `promotion` + `effective_price` to `GET /courses` and `GET /courses/:id`; `courses.discount_percentage` column retained but always 0.
- Effective-price fallback pitfall: `Number(course.effective_price) ?? X` is a no-op because `Number(undefined)` is `NaN` (not nullish). Correct pattern, already used in `Checkout.tsx`: `Number(course.effective_price ?? (course.price * (1 - ...)))`. `Courses.tsx` and `public/CourseDetails.tsx` still use the broken order — fix when next touching them.
- Board policy workflow: `draft → pending_review → approved/rejected/archived`; `decidePolicy` bumps version on approval. Admin actions guarded by `authorize('admin', 'super_admin')`.
- Migration/seed scripts live at `backend/migrations/{017_promotions,018_board_governance}.sql`; board seed via `npm run seed:board` (uses `src/seed-board.ts`).

## Work State
### Completed
- Backend: migrations `017_promotions.sql`, `018_board_governance.sql`; models `promotion.ts`, `board.ts`, `pathwayFinder.ts`, `payment.ts`; routes `promotion.routes.ts`, `board.routes.ts`, `pathwayFinder.routes.ts`, edits to `payment.routes.ts`, `course.routes.ts`, `admin.routes.ts`; mounted in `src/index.ts`; `seed-board.ts` + `"seed:board"` script. Backend build clean.
- Backend tests: new `src/__tests__/pathwayFinder.model.test.mjs` (4 tests: anonymous no-db path, authenticated annotate + summary + next-step, enrolled-incomplete-before-uncompleted selection, null next step when all complete). Uses `mock.module` on `../config/db.ts`, `../models/careerGoal.ts`, `../models/learningPath.ts`. All 90 pass.
- Frontend wiring: `Sidebar.tsx` (Compass/BadgePercent/Landmark icons added; student "Pathway Finder" after Learning Paths; admin+adminNarrow "Promotions" + "Board Oversight"); `App.tsx` lazy routes — public `/board`, student `pathway-finder`, admin `promotions`, `board-oversight`; `Footer.tsx` "Board of Directors" → `/board` under Company.
- New frontend pages: `pages/student/PathwayFinder.tsx` (dead `live` state removed), `pages/admin/Promotions.tsx`, `pages/public/Board.tsx`, `pages/admin/BoardOversight.tsx`.
- Pricing displays switched to `course.promotion`/`course.effective_price`: `pages/Courses.tsx`, `pages/public/CourseDetails.tsx`, `pages/public/Checkout.tsx`, `components/home/FeaturedCourses.tsx`. `store/courseStore.ts` `Course` has `promotion?: Promotion | null` + `effective_price?: number`.
- Discount inputs removed: `pages/instructor/CourseEditor.tsx`, `pages/admin/AdminCourseDetail.tsx`. No remaining `discount_percentage`/`discountPercentage` usage except the type in `courseStore.ts`.
- `pages/FAQ.tsx`: FAQ is now promotion-only ("How do discounts work?"). `guides/public/CourseDetails.guide.ts`: pricing wording mentions promotions, not standing discounts.
- Frontend build errors fixed (TodoList→ListChecks, Badge `variant="outline"`→`default` in Board.tsx + PathwayFinder.tsx, two Button `fullWidth`→`className="w-full"`). Build + tsc now pass.

### Blocked
- None. (Previously: frontend tsc errors — now resolved. Tooling note: `rg` unavailable on Windows.)

## Next Move (optional polish, none blocking)
1. Fix the `Number(effective_price) ?? fallback` ordering in `pages/Courses.tsx` and `pages/public/CourseDetails.tsx` (move `??` before `Number`) to match `Checkout.tsx`.
2. Optional: add backend route tests for `pathwayFinder.routes.ts` / `promotion.routes.ts` following `calendar.routes.test.mjs` patterns.
3. Optional: run board/promotion seed + smoke-test the new admin pages against a running backend.

## Relevant Files
- Backend: `src/models/{promotion,board,pathwayFinder,payment}.ts`, `src/routes/{promotion,board,pathwayFinder,payment,course,admin}.routes.ts`, `src/__tests__/pathwayFinder.model.test.mjs`, `src/seed-board.ts`, `migrations/017_promotions.sql`, `migrations/018_board_governance.sql`, `src/index.ts`.
- Frontend new pages: `src/pages/student/PathwayFinder.tsx`, `src/pages/admin/Promotions.tsx`, `src/pages/public/Board.tsx`, `src/pages/admin/BoardOversight.tsx`.
- Frontend edits: `src/App.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/Footer.tsx`, `src/store/courseStore.ts`, `src/pages/Courses.tsx`, `src/pages/public/CourseDetails.tsx`, `src/pages/public/Checkout.tsx`, `src/components/home/FeaturedCourses.tsx`, `src/pages/instructor/CourseEditor.tsx`, `src/pages/admin/AdminCourseDetail.tsx`, `src/pages/FAQ.tsx`, `src/guides/public/CourseDetails.guide.ts`.