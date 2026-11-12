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
   ├─ /api/courses                         generate / list / get / delete
   │     └─ services/course.service ──► services/gemini.service ──► Google Gemini
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
│       ├── components/        Sidebar, Logo, ServerStatus …
│       ├── pages/             HomePage, NotFoundPage …
│       ├── hooks/             useServerStatus …
│       ├── utils/api.js       axios instance + error-message helper
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
| 2. Lesson | First time a lesson is opened *(next phase)* | objectives, key topics, content blocks, MCQs, readings | Lesson updated, `isEnriched: true` |

Generating 20+ full lessons up front would take 20+ calls (minutes of waiting) and waste
tokens on lessons nobody opens. Lazy generation makes course creation fast (one call) and
each lesson is generated once, then served from MongoDB forever.

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

Error shape (all endpoints): `{ "error": { "message": "...", "code": "VALIDATION_ERROR", "details": [...] } }`

## 7. Configuration

Validated once at startup by `server/config/env.js` (zod). Bad config → the server refuses to start
with a readable message, instead of failing on the first request.

| Variable | Where | Purpose |
|---|---|---|
| `MONGO_URI` | server | Atlas connection string (empty in dev → in-memory MongoDB) |
| `CLIENT_URL` | server | allowed CORS origin(s), comma-separated |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | server | AI access; model defaults to `gemini-3.5-flash-lite` |
| `VITE_API_URL` | client | backend base URL (public, baked into the bundle) |

Secrets live **only** on the server. Anything prefixed `VITE_` ends up in public JavaScript.

## 8. Quality & tooling

- **Tests:** vitest + supertest against an in-memory MongoDB; the Gemini SDK is mocked, so tests
  are fast, free and deterministic. Covered: validation, persistence, cascade delete, retry on
  invalid AI output, error mapping, JSON parsing.
- **Lint:** ESLint (server), oxlint (client).
- **CI:** GitHub Actions runs lint + tests (server) and lint + build (client) on every push/PR.
- **Git workflow:** one feature branch per phase, merged into `main` with `--no-ff`.

## 9. Roadmap

- [x] Phase 0: Monorepo scaffold, health check, CI
- [x] Phase 1: Models + AI course-outline generation
- [ ] Phase 2: Frontend: prompt form, course page, lesson renderer + blocks, loading/error states
- [ ] Phase 3: On-demand lesson generation (objectives, blocks, 4–5 MCQs, readings)
- [ ] Phase 4: Auth0 login + per-user courses
- [ ] Phase 5: YouTube videos (cached) · Phase 6: PDF export · Phase 7: Hinglish TTS
- [ ] Phase 8: Extras (progress tracking, dark mode, "ask a doubt" tutor, share links)
- [ ] Phase 9: Deploy (Render + Vercel), README, demo video
