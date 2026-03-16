# SimbaApp

Saudi telecom plan comparison platform (150+ plans, 8 carriers). Monorepo: React frontend + Express backend.

## Commands

```bash
# Install
npm run install:all

# Dev (run both in parallel)
npm run dev:frontend    # Vite on :5173
npm run dev:backend     # Express on :3001 (tsx watch)

# Build
npm run build:frontend  # tsc + vite build → frontend/dist/
npm run build:backend   # tsc → backend/dist/

# Lint (frontend only)
cd frontend && npm run lint
```

No test framework is configured yet.

## Architecture

- **Frontend:** React 19, Vite 7, TypeScript, Tailwind CSS 4, React Router 7
- **Backend:** Express 5.1, TypeScript, Firebase Admin, OpenAI SDK
- **Database:** Firebase Firestore (users, planReactions, planComments)
- **Auth:** Firebase Auth (Google Sign-In), verified via backend middleware
- **AI Advisor:** OpenAI GPT-4 mini, full plan catalog in system prompt

## Key Conventions

### Frontend
- State via React Context (AuthContext, PlansContext, CompareContext, BookmarkContext, LanguageContext) — no Redux/Zustand
- UI primitives from shadcn/ui (Radix UI + CVA) in `components/ui/`
- Path alias: `@/` → `frontend/src/`
- All pages are lazy-loaded via `React.lazy()` in App.tsx
- Firebase is lazy-initialized — never import firebase modules at top level, use `getFirebaseAuth()` / `getFirebaseDb()` async getters from `lib/firebase.ts`
- API calls go through `apiFetch()` from `lib/api.ts` — it handles auth headers automatically
- Analytics (GA4, Mixpanel, Clarity) are lazy-loaded via `requestIdleCallback` — don't import analytics libs directly
- Bilingual: English + Arabic with RTL. All user-facing strings go through `useLang().t()`
- Styling: Tailwind 4 with `@theme` in `index.css`, carrier colors defined there. Use `cn()` utility for conditional classes

### Backend
- Layered architecture: `routes/` → `controllers/` → `services/` → `models/`
  - **Routes** (`src/routes/`): Pure path mappings — only define HTTP method + path + middleware + controller
  - **Controllers** (`src/controllers/`): Handle req/res — extract params, call services, send responses
  - **Services** (`src/services/`): Business logic — caching, validation, OpenAI integration, signal merging
  - **Models** (`src/models/`): Firestore operations — CRUD for planReactions, planComments, users, userSegments
- Auth middleware: `requireAuth` from `middleware/auth.ts` — verifies Firebase ID token
- Shared utilities in `src/utils/` (e.g. `validatePlanId`)
- Rate limiting: 10/min on advisor, 30/min on interactions
- Plan data is in-memory (`src/data/plans.ts`), not in Firestore
- Engagement data cached in-memory with 60s TTL
- Firebase credentials: `FIREBASE_SERVICE_ACCOUNT_KEY` env var (JSON string for Render) or `GOOGLE_APPLICATION_CREDENTIALS` file path

## Routes

```
/              → HomePage
/plans         → ExplorePage (browse with filters)
/browse        → PlansPage (alternate browse view)
/plan/:id      → PlanDetailPage
/advisor       → AdvisorPage (AI chat)
/compare       → ComparePage (up to 3 plans)
/switch        → SwitchSavePage
/profile       → ProfilePage
/about         → AboutPage
/explore       → redirects to /plans
/finder        → redirects to /advisor
```

## API Endpoints

```
GET  /api/health
GET  /api/plans/cards          # Lightweight plan data for cards
GET  /api/plans                # Full plan data
GET  /api/plans/:id
GET  /api/plan-interactions/engagement     # Batch reactions + comment counts
POST /api/plan-interactions/:id/reactions/like     # Auth required
POST /api/plan-interactions/:id/reactions/dislike  # Auth required
GET  /api/plan-interactions/:id/comments
POST /api/plan-interactions/:id/comments           # Auth required, max 500 chars
DELETE /api/plan-interactions/:id/comments/:cid    # Auth required, author only
POST /api/advisor/message              # AI advisor chat
```
