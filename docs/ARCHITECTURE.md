# Edify: Architecture

Edify turns a free-form topic ("Intro to React Hooks") into a structured course:
**Course → 3–6 Modules → 3–5 Lessons each**, where every lesson has objectives,
explanations, code, a video and a quiz.

> This document describes what is **built so far** and is updated after every phase.
> The roadmap at the bottom lists what's next.

---

## 1. System overview

```
 Browser: React + Vite + Tailwind (Vercel)
   │   axios → {VITE_API_URL}/api/...
   ▼
 Express API: Node 22 (Render)
   ├─ helmet · cors · json · morgan       (global middleware)
   ├─ /api/health                          health + DB status (also wakes Render)
   ├─ /api/courses                         generate outline / list / get / delete
   ├─ /api/lessons                         get / generate content on first open
   │     └─ course|lesson.service ──► gemini.service ──► Google Gemini
   └─ errorHandler                         one JSON error shape for everything
   ▼
 MongoDB (Atlas in prod, in-memory in local dev/tests)
   courses · modules · lessons
```

## 2. Repository layout

```
Edify/
├── client/                    React app (deployed to Vercel)
│   └── src/
│       ├── components/
│       │   ├── LessonRenderer.jsx   content[] → block components
│       │   ├── blocks/              Heading, Paragraph, List, Code, Callout, Video, MCQ (+ InlineText)
│       │   ├── course/              CourseCard, CourseOutline, LevelBadge
│       │   ├── ui/                  LoadingSpinner, ErrorMessage, Skeleton
│       │   └── PromptForm, GeneratingCourse, Sidebar, ServerStatus, Logo
│       ├── pages/             HomePage, CourseLayout, CoursePage, LessonPage, NotFoundPage
│       ├── hooks/             useCourse, useLesson, useCourses, useServerStatus, useDocumentTitle
│       ├── context/           CoursesProvider (global course list)
│       ├── utils/             api.js (axios + endpoint helpers), paths.js (URL builders)
│       ├── App.jsx            layout (sidebar + <Outlet/>)
│       └── main.jsx           providers + routes
├── server/                    Express API (deployed to Render)
│   ├── server.js              entry: env → DB → listen
│   ├── app.js                 builds the Express app (importable by tests)
│   ├── config/                env validation (zod), MongoDB connection
│   ├── routes/                URL → middleware chain → controller
│   ├── controllers/           HTTP in/out only, no business logic
│   ├── services/              business logic + external APIs (Gemini, prompts)
│   ├── models/                Mongoose schemas
│   ├── schemas/               zod schemas (requests + AI output)
│   ├── middlewares/           validation, rate limiting, errors
│   ├── utils/                 ApiError
│   ├── scripts/               check-gemini.js (verify AI setup)
│   └── tests/                 vitest + supertest + in-memory MongoDB
├── docs/                      this file
└── .github/workflows/ci.yml   lint + test + build on every push/PR
```

**Layering rule:** `routes → controllers → services → models`. Each layer only calls the
one below it. Controllers never talk to Gemini or build queries; services never touch `req`/`res`.

## 3. Life of a request

`POST /api/courses/generate  { "prompt": "Intro to React Hooks", "level": "beginner" }`

1. **Global middleware** (`app.js`): `helmet` sets security headers, `cors` allows only our
   frontend origin, `express.json` parses the body (max 100 kB).
2. **Route** (`routes/course.routes.js`) runs a chain:
   - `generationLimiter`: max 15 generations / 15 min per client (protects the AI quota).
   - `validate({ body: generateCourseSchema })`: zod checks `prompt` (3–500 chars),
     `level` (enum), `moduleCount` (3–6, optional). Invalid → **400** with per-field errors.
3. **Controller** (`course.controller.js`) pulls validated fields and calls the service.
4. **Service** (`course.service.js`):
   - builds the prompt (`services/prompts.js`),
   - calls `generateJSON()` (`services/gemini.service.js`),
   - saves the result (`saveCourseOutline`) and returns the populated course.
5. **Response:** `201 { course }`. Any thrown error ends up in `errorHandler` →
   `{ error: { message, code?, details? } }`.

Express 5 forwards errors thrown in `async` handlers to the error middleware automatically,
so there is no try/catch boilerplate in controllers.

## 4. The AI generation pipeline

### Two stages (token + latency optimisation)

| Stage | When | One AI call returns | Saved as |
|---|---|---|---|
| 1. Outline | User clicks *Generate* | title, description, tags, modules, lesson titles | Course + Modules + **Lesson shells** (`isEnriched: false`) |
| 2. Lesson | First time a lesson is opened | objectives, key topics, content blocks, 4–5 MCQs, readings | Lesson updated, `isEnriched: true` |

Generating 20+ full lessons up front would take 20+ calls (minutes of waiting) and waste
tokens on lessons nobody opens. Lazy generation makes course creation fast (one call) and
each lesson is generated once, then served from MongoDB forever.

### Stage 2 in detail (`lesson.service.js`)

1. `POST /api/lessons/:id/generate` loads the lesson and checks that the user owns its course.
2. Already enriched (and no `force`)? Return it from the DB: **no AI call, no cost**.
3. **In-flight dedupe:** a `Map` of running generations keyed by lesson id. A second request for
   the same lesson (double click, two tabs, React StrictMode) awaits the same promise → one AI call.
4. The prompt includes the course title, level, module title and **sibling lesson titles**, so the
   AI stays in scope and doesn't repeat what neighbouring lessons cover.
5. Output is validated, then **normalised**: each block is rebuilt with only the fields its type
   allows; resource URLs that aren't valid `https` are dropped (the search-query fallback stays).
6. `force: true` (the *Regenerate* button) rewrites an existing lesson.

### Lesson content blocks

| `type` | Fields | Rendered by |
|---|---|---|
| `heading` | `text` | `HeadingBlock` |
| `paragraph` | `text` (supports `**bold**`, `*italic*`, `` `code` ``) | `ParagraphBlock` |
| `list` | `items[]`, `ordered` | `ListBlock` |
| `code` | `language`, `text` (only when the topic is technical) | `CodeBlock` (Prism highlighting + copy) |
| `callout` | `variant` (tip / note / warning), `text` | `CalloutBlock` |
| `video` | `query`: a YouTube **search query**, never a URL | `VideoBlock` |
| `mcq` | `question`, `options[4]`, `answer` (0-based), `explanation` | `MCQBlock` (instant feedback + score) |

**Why a flat block schema for the AI?** LLMs follow one flat object with optional fields far more
reliably than a union of seven shapes. zod's `superRefine` enforces each type's required fields
(e.g. an MCQ's `answer` must be a valid option index), and `normalizeBlock()` produces clean typed blocks.

### Mock mode (`AI_MOCK=true`, development only)

`generateJSON()` accepts a `mock` function. With `AI_MOCK=true` it returns realistic sample data
(after a simulated 1.2 s delay) instead of calling Gemini, so the UI can be built and demoed with no
key and no quota. A test guarantees the mock data always passes the real AI schemas, and the server
refuses to start with `AI_MOCK=true` in production.

### Making AI output reliable (`gemini.service.js`)

1. **JSON mode + response schema.** The zod schema is converted to JSON Schema
   (`z.toJSONSchema`) and sent as `responseJsonSchema`, so Gemini is constrained to our shape.
   One schema definition = what we ask for **and** what we validate.
2. **Defensive parsing:** strips ```` ```json ```` fences / surrounding prose if present.
3. **zod validation:** wrong types, 2 lessons instead of 3–5, etc. are rejected.
4. **One retry** on invalid output, then a clean `502 AI_INVALID_RESPONSE`.
5. **Error mapping:** Gemini 429 → `429 AI_RATE_LIMITED`, blocked by safety filters → `422 AI_BLOCKED`,
   missing key → `503 AI_NOT_CONFIGURED`. The SDK's default of 5 retries with up to 60 s
   back-off is reduced to 2 attempts + 60 s timeout so users never wait minutes.
6. Token usage and latency are logged for every call (`🤖 course outline: 1234 tokens in 4100ms`).

### Prompt design (`prompts.js`)

- A **system instruction** sets the persona (expert instructional designer) and the "raw JSON only" rule.
- User text is wrapped in `<learner_request>` tags and declared as data → mitigates prompt injection.
- Concrete rules: module/lesson counts, foundations → advanced ordering, a final applied module,
  no duplicates, specific lesson titles (with a good vs bad example), level-specific guidance.

## 5. Data model

```
Course 1 ──< Module 1 ──< Lesson
```

| Model | Key fields |
|---|---|
| **Course** | `title`, `description`, `creator` (Auth0 `sub`), `modules[]` → Module, `tags[]`, `prompt`, `level`, timestamps |
| **Module** | `title`, `description`, `course` → Course, `order`, `lessons[]` → Lesson |
| **Lesson** | `title`, `module` → Module, `course` → Course, `order`, `objectives[]`, `keyTopics[]`, `content[]` (flexible blocks), `resources[]`, `isEnriched` |

Design notes:
- **References both ways** (`Course.modules[]` and `Module.course`): the array keeps display order
  and makes `populate()` easy; the back-reference makes cascade deletes and ownership checks one query.
- `Lesson.course` is **denormalised** so "delete all lessons of a course" or "does this user own
  this lesson?" never needs a join.
- **Saving an outline = 3 writes** regardless of size: all `_id`s are created in memory first
  (`new Model()` assigns them), references are wired up, then `insertMany(lessons)`,
  `insertMany(modules)`, `course.save()`. On failure everything created is deleted (no half courses).
- `content` is `Mixed[]` so new block types (e.g. `flashcard`) need no migration.
- Index `{ creator: 1, createdAt: -1 }` serves "my courses, newest first".
- Courses are always queried with `{ _id, creator }`, so another user's course returns **404**
  (we don't even reveal it exists).

## 6. API reference (implemented)

| Method | Path | Body / notes | Success |
|---|---|---|---|
| GET | `/api/health` | DB status, uptime | `200` |
| POST | `/api/courses/generate` | `{ prompt, level?, moduleCount? }`, rate-limited | `201 { course }` |
| GET | `/api/courses` | user's courses + `moduleCount`, `lessonCount`, `enrichedCount` | `200 { courses }` |
| GET | `/api/courses/:id` | course + modules + lesson titles (no content) | `200 { course }` |
| DELETE | `/api/courses/:id` | cascades to modules + lessons | `204` |
| GET | `/api/lessons/:id` | one lesson (empty `content` until generated) | `200 { lesson }` |
| POST | `/api/lessons/:id/generate` | `{ force? }`, rate-limited; returns stored content if already generated | `200 { lesson }` |

Error shape (all endpoints): `{ "error": { "message": "...", "code": "VALIDATION_ERROR", "details": [...] } }`

## 7. Frontend

### Routes (React Router v7, declared in `main.jsx`)

```
/                                                   App (sidebar layout)
├── (index)                                         HomePage: PromptForm + your courses
├── courses/:courseId                               CourseLayout: loads the course once
│   ├── (index)                                     CoursePage: overview + modules + lessons
│   └── module/:moduleIndex/lesson/:lessonIndex     LessonPage (1-based numbers in the URL)
└── *                                               NotFoundPage
```

`CourseLayout` fetches the course **once** and passes it to the overview and every lesson through
`<Outlet context>`, so moving between lessons never refetches the course. When a lesson finishes
generating, `markLessonEnriched()` updates that shared copy and the outline's check marks update instantly.

### State & data fetching

- **`CoursesProvider` (Context):** the course list for the sidebar and home page. Loaded once; after a
  create/delete it is updated locally instead of refetched.
- **`useCourse(id)` / `useLesson(id)`:** custom hooks that return `{ data, status, error, retry }`.
  - Every request takes an `AbortController` signal, so navigating away cancels it and a slow
    response can never overwrite newer data.
  - "Loading" is **derived**: each result stores the request key it belongs to, and the hook is
    loading whenever the latest result isn't for the current key (no `setState` at the start of an effect).
  - `useLesson` runs the lazy pipeline: `GET` the lesson → if not enriched, `POST …/generate`
    (status `generating`) → `ready`.
- **`utils/api.js`:** one axios instance (`VITE_API_URL`, 90 s timeout) plus `coursesApi` / `lessonsApi`
  helpers and `getErrorMessage()`, which turns any failure into a sentence for the UI.

### Loading & error UX

| Situation | What the user sees |
|---|---|
| Generating an outline (~5–15 s) | `GeneratingCourse`: step list that advances while the AI works |
| Generating a lesson (first open) | "Writing this lesson for you…" banner + skeleton |
| Any API failure | `ErrorMessage` with the server's friendly message and a *Try again* button |
| Backend asleep (Render free tier) | Sidebar status shows "Waking up server…" |

### Security in rendering

AI text is **never** inserted as HTML. `InlineText` parses `**bold**`, `*italic*` and `` `code` ``
into React elements, so injected `<script>` or HTML in AI output is displayed as plain text.

## 8. Configuration

Validated once at startup by `server/config/env.js` (zod). Bad config → the server refuses to start
with a readable message, instead of failing on the first request.

| Variable | Where | Purpose |
|---|---|---|
| `MONGO_URI` | server | Atlas connection string (empty in dev → in-memory MongoDB) |
| `CLIENT_URL` | server | allowed CORS origin(s), comma-separated |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | server | AI access; model defaults to `gemini-3.5-flash-lite` |
| `AI_MOCK` | server | `true` = sample content instead of Gemini (dev only, rejected in production) |
| `VITE_API_URL` | client | backend base URL (public, baked into the bundle) |

Secrets live **only** on the server. Anything prefixed `VITE_` ends up in public JavaScript.

## 9. Quality & tooling

- **Tests:** vitest + supertest against an in-memory MongoDB; the Gemini SDK is mocked, so tests
  are fast, free and deterministic. Covered: validation, persistence, cascade delete, retry on
  invalid AI output, error mapping, JSON parsing, lesson caching, in-flight dedupe, block
  normalisation, and mock data staying in sync with the schemas.
- **Lint:** ESLint (server), oxlint (client).
- **CI:** GitHub Actions runs lint + tests (server) and lint + build (client) on every push/PR.
- **Git workflow:** one feature branch per phase, merged into `main` with `--no-ff`.

## 10. Roadmap

- [x] Phase 0: Monorepo scaffold, health check, CI
- [x] Phase 1: Models + AI course-outline generation
- [x] Phase 2: Frontend: prompt form, course page, lesson renderer + blocks, loading/error states
- [x] Phase 3: On-demand lesson generation (objectives, blocks, 4–5 MCQs, readings)
- [ ] Phase 4: Auth0 login + per-user courses
- [ ] Phase 5: YouTube videos (cached) · Phase 6: PDF export · Phase 7: Hinglish TTS
- [ ] Phase 8: Extras (progress tracking, dark mode, "ask a doubt" tutor, share links)
- [ ] Phase 9: Deploy (Render + Vercel), README, demo video
