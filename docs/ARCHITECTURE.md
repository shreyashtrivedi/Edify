# Edify: Architecture

Edify turns a free-form topic ("Intro to React Hooks") into a structured course:
**Course → 3–6 Modules → 3–5 Lessons each**, where every lesson has objectives,
explanations, code, a video and a quiz.

> This document describes what is **built so far** and is updated after every phase.
> The roadmap at the bottom lists what's next.

---

## 1. System overview

```
 Browser: React + Vite + Tailwind (Vercel) ◄──── login ────► Auth0 (hosted login, Google)
   │   axios → {VITE_API_URL}/api/...  +  Authorization: Bearer <access token>
   ▼
 Express API: Node 22 (Render)
   ├─ helmet · cors · json · morgan       (global middleware)
   ├─ /api/health                          public: health + DB status (also wakes Render)
   ├─ requireAuth                          verifies the Auth0 token → req.user.sub
   │   ├─ /api/courses                     generate outline / list / get / delete
   │   ├─ /api/lessons                     get / generate content on first open
   │   │     └─ course|lesson.service ──► gemini.service ──► Google Gemini
   │   │                                  ├► youtube.service ──► YouTube Data API (cached)
   │   │                                  └► narration.service ─► Gemini text + Gemini TTS → MP3
   │   └─ /api/users/me                    profile sync + stats
   └─ errorHandler                         one JSON error shape for everything
   ▼
 MongoDB (Atlas in prod, in-memory in local dev/tests)
   courses · modules · lessons · lessonaudios · users · videocaches
```

## 2. Repository layout

```
Edify/
├── client/                    React app (deployed to Vercel)
│   └── src/
│       ├── auth/              AuthProvider (Auth0 + token → axios), RequireAuth (route guard), config
│       ├── pdf/               PDF export: LessonSection, documents (lesson + course), styles, text sanitising
│       ├── components/
│       │   ├── home/                Landing (logged-out home page)
│       │   ├── LessonRenderer.jsx   content[] → block components
│       │   ├── blocks/              Heading, Paragraph, List, Code, Callout, Video, MCQ (+ InlineText)
│       │   ├── course/              CourseCard, CourseOutline, LevelBadge
│       │   ├── ui/                  LoadingSpinner, ErrorMessage, Skeleton
│       │   └── PromptForm, GeneratingCourse, Sidebar, UserMenu, ServerStatus, Logo
│       ├── pages/             HomePage, CourseLayout, CoursePage, LessonPage, NotFoundPage
│       ├── hooks/             useCourse, useLesson, useCourses, useServerStatus, useDocumentTitle
│       ├── context/           CoursesProvider (global course list)
│       ├── utils/             api.js (axios + endpoint helpers), paths.js (URL builders), inlineFormat.js, format.js
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
│   ├── middlewares/           auth (JWT check), validation, rate limiting, errors
│   ├── utils/                 ApiError, audio (PCM → MP3)
│   ├── scripts/               check-gemini.js, check-youtube.js, check-tts.js (verify API keys)
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
2. **Auth** (`routes/index.js` mounts `requireAuth` before every router except `/health`):
   the `Authorization: Bearer` token is verified and `req.user.sub` is set. No/invalid token → **401**.
3. **Route** (`routes/course.routes.js`) runs a chain:
   - `generationLimiter`: max 15 generations / 15 min **per user** (protects the AI quota).
   - `validate({ body: generateCourseSchema })`: zod checks `prompt` (3–500 chars),
     `level` (enum), `moduleCount` (3–6, optional). Invalid → **400** with per-field errors.
4. **Controller** (`course.controller.js`) pulls validated fields + `req.user.sub` and calls the service.
5. **Service** (`course.service.js`):
   - builds the prompt (`services/prompts.js`),
   - calls `generateJSON()` (`services/gemini.service.js`),
   - saves the result (`saveCourseOutline`) and returns the populated course.
6. **Response:** `201 { course }`. Any thrown error ends up in `errorHandler` →
   `{ error: { message, code?, details? } }`.

Express 5 forwards errors thrown in `async` handlers to the error middleware automatically,
so there is no try/catch boilerplate in controllers.

## 4. Authentication (Auth0)

Auth0 handles everything about identity: sign-up, passwords, Google login, email verification.
Edify never sees a password. Our job is only to **verify who is calling** and **scope data to them**.

### The flow

```
1. User clicks "Log in"          → loginWithRedirect() → Auth0 hosted login page
2. User logs in (email / Google) → Auth0 redirects to http://localhost:5173/?code=…
3. Auth0 SDK swaps the code      → ID token (who you are) + access token (what you may call)
                                   (Authorization Code flow + PKCE: no client secret in the browser)
4. Every API call                → axios interceptor adds  Authorization: Bearer <access token>
5. Express requireAuth           → verifies the token → req.user.sub = "google-oauth2|1234…"
6. Services                      → every query includes { creator: req.user.sub }
```

### How the server verifies a token (`middlewares/auth.js`)

The access token is a **JWT** signed by Auth0 with its private key (RS256). `express-oauth2-jwt-bearer`
checks, without calling Auth0 per request:

| Check | Why |
|---|---|
| **Signature** against Auth0's public keys (JWKS, fetched once and cached) | nobody can forge or edit a token |
| **Issuer** = `https://<tenant>.us.auth0.com/` | issued by *our* tenant, not some other Auth0 account |
| **Audience** = `https://edify-api` | issued *for this API*, so a token for another app is useless here |
| **Expiry** (`exp`) | stolen old tokens stop working |

Failures become our standard error shape: `401 AUTH_REQUIRED` (no token), `401 TOKEN_EXPIRED`,
`401 INVALID_TOKEN`.

### Authorization: who can see what

- `creator` on every Course is the token's `sub`. Every read/delete queries `{ _id, creator }`, and
  lessons are checked through their course. Another user's id returns **404, not 403**, so users
  can't even probe which ids exist. A test (`auth.test.js`) proves Bob can't read, generate or delete
  Alice's content.
- The frontend route guard (`RequireAuth`) is only for UX (it redirects to login and back to the
  same page). **The real protection is the server**: the UI can be bypassed, the token check can't.
- AI generation is rate-limited **per user** (`req.user.sub`), so people sharing one IP address
  (a college Wi-Fi) don't block each other.

### Frontend pieces

| File | Role |
|---|---|
| `auth/AuthProvider.jsx` | `<Auth0Provider>` (inside the router so it can navigate back after login) + `ApiAuthBridge`, which hands `getAccessTokenSilently` to axios and syncs the profile once per login |
| `utils/api.js` | request interceptor: awaits a token and sets the `Authorization` header |
| `auth/RequireAuth.jsx` | layout route guarding `/courses/*`; saves `returnTo` in `appState` |
| `components/UserMenu.jsx` | avatar + name + log out, or Log in / Sign up |
| `components/home/Landing.jsx` | logged-out home page; shows the reason if a login failed |

Session details: tokens are cached in `localStorage` and renewed with **refresh tokens**, because the
older "hidden iframe" renewal is blocked by modern browsers' third-party-cookie rules.
The token getter is registered in a `useLayoutEffect`, which React runs before all normal effects,
so no component can fire a request before the token is available.

### Users collection

`User { auth0Id (unique), name, email, picture, lastLoginAt }`. After login the frontend calls
`PUT /api/users/me` with the profile from Auth0 (an **upsert**: created on first login, updated after).
It is display data only; permissions always come from the verified token.

### Testing auth without Auth0

`createApp({ requireAuth })` takes the middleware as a dependency. Tests inject the **same library**
configured with a local HS256 secret and sign real tokens with `jose` (`tests/helpers/auth.js`), so
signature, issuer, audience and expiry checks all run for real, offline and in milliseconds.

## 5. The AI generation pipeline

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
5. Output is validated and cleaned by `lessonContentSchema` (see *forgiving validation* below).
6. `force: true` (the *Regenerate* button) rewrites an existing lesson.

Measured with the real API (`gemini-3.5-flash-lite`): outline ≈ 3 s / ~900 tokens,
lesson ≈ 6–7 s / ~2,600 tokens, both valid on the first attempt.

### Hinglish audio narration (`narration.service.js`, `tts.service.js`)

A **Listen in Hinglish** card on every lesson. Nothing is generated until the learner clicks it.

```
POST /api/lessons/:id/narration
  1. Script   text model: lesson (headings, paragraphs, lists; no code/quiz) → ~150-220 word
              spoken explanation in Hinglish, as JSON { script }            (~2 s)
  2. Speech   TTS model (gemini-3.8-flash-lite-tts, voice "Kore"):
              script → raw PCM, 16-bit, 24 kHz, mono                         (~10 s for ~70 s of audio)
  3. Encode   PCM → MP3 at 48 kbps with lamejs (pure JS)                     (~0.5 s, 2.7 MB → ~350 KB/min)
  4. Store    MP3 in `lessonaudios` (own collection), { transcript, durationSeconds } on the lesson
GET /api/lessons/:id/narration/audio  → the MP3 (Cache-Control: private, 1 day)
```

Design decisions:
- **Devanagari for Hindi, Latin for English terms** ("आज हम JavaScript में promises सीखेंगे"). TTS pronounces
  Hindi most naturally from its own script, and technical terms stay English, the way developers say
  them. The first prompt version produced Roman Hinglish ("Aaj hum seekhenge"); adding a correct/wrong
  example pair to the prompt fixed it (~70% Devanagari letters).
- **Generated once, stored forever:** the free TTS quota is small and a narration costs 2 AI calls, so
  repeat plays are pure database reads. Regenerating a lesson deletes its narration (it would be wrong).
- **Audio in its own collection:** opening a lesson never downloads its MP3; only pressing play does.
- **Auth for audio:** an `<audio src>` request can't carry the `Authorization` header, so the client
  fetches the MP3 with axios (`responseType: 'blob'`) and plays it from a `blob:` URL (revoked on unmount).
- **API version gotcha:** SDK v3 calls the stable `v1` API by default, which rejects `speechConfig`
  ("Unknown name speechConfig"). The TTS call overrides `httpOptions.apiVersion = 'v1beta'` for that request only.
- **Style direction:** the TTS text starts with "Read the following aloud like a warm, friendly Indian
  teacher…". Verified by transcribing the output that this steers the voice and is *not* read aloud.

### Real videos instead of invented links (`youtube.service.js`)

Language models make up YouTube links that look real but don't exist. So the AI never writes a URL:
it writes a **search query** (`{ "type": "video", "query": "python lists for beginners tutorial" }`),
and before the lesson is saved the server resolves it with the official **YouTube Data API v3**:

1. **Cache first.** The query is normalised (`trim`, lowercase, single spaces) and looked up in the
   `videocaches` collection. A hit costs nothing.
2. **`search.list`** (100 quota units): top 5 results with `type=video`, `videoEmbeddable=true`
   (must play inside our page), `safeSearch=strict`.
3. **`videos.list`** (1 unit): durations (ISO 8601, e.g. `PT13M5S`) and view counts for those 5.
4. **Pick:** keep "lesson-sized" videos (3 to 45 min: no Shorts, no 4-hour livestreams); among the 3
   most relevant of those, take the most viewed. Relevance first, popularity as a quality signal.
5. **Save** `video: { videoId, title, channel, thumbnail, durationSeconds }` on the block and in the cache
   (TTL index: found → 30 days, "nothing suitable" → 1 day, so dead videos eventually get replaced).

**Why caching matters:** the free quota is 10,000 units/day, and one search costs 101, so only about
**99 uncached searches a day**. Similar lessons produce similar queries, so the cache stretches that a long way.

**Never blocks a lesson:** no key, quota exhausted or network error → the error is logged, *not*
cached (tomorrow it can work again), and the block keeps only its `query`, which the UI shows as a
"Find a video on YouTube" search link.

### Lesson content blocks

| `type` | Fields | Rendered by |
|---|---|---|
| `heading` | `text` | `HeadingBlock` |
| `paragraph` | `text` (supports `**bold**`, `*italic*`, `` `code` ``) | `ParagraphBlock` |
| `list` | `items[]`, `ordered` | `ListBlock` |
| `code` | `language`, `text` (only when the topic is technical) | `CodeBlock` (Prism highlighting + copy) |
| `callout` | `variant` (tip / note / warning), `text` | `CalloutBlock` |
| `video` | `query`: a YouTube **search query** from the AI, never a URL; `video`: added by the server (see above) | `VideoBlock` (lite embed, or search link fallback) |
| `mcq` | `question`, `options[4]`, `answer` (0-based), `explanation` | `MCQBlock` (instant feedback + score) |

**Forgiving validation (`schemas/lesson.schemas.js`).** Each block type has its own small zod
schema. A block that doesn't match (unknown type, list with one item, MCQ whose `answer` isn't a
valid index…) is **dropped**, not fatal: we salvage the good content instead of paying for a full
retry. Small mistakes are repaired (unknown callout variant → `note`, unknown resource type →
`article`, non-https URL → removed but the search fallback stays) and unknown fields are stripped.
The lesson is only rejected (→ one retry) if what remains isn't usable: fewer than 3 valid MCQs
or fewer than 2 paragraphs.

### Mock mode (`AI_MOCK=true`, development only)

`generateJSON()` accepts a `mock` function. With `AI_MOCK=true` it returns realistic sample data
(after a simulated 1.2 s delay) instead of calling Gemini, so the UI can be built and demoed with no
key and no quota. A test guarantees the mock data always passes the real AI schemas, and the server
refuses to start with `AI_MOCK=true` in production.

### Making AI output reliable (`gemini.service.js`)

1. **Two output strategies, chosen per task** (`enforceSchema` option), decided by testing against the real API:

   | | Course outline | Lesson content |
   |---|---|---|
   | Shape | small, rigid | large, flexible (7 block types) |
   | Strategy | **schema-constrained decoding**: zod → JSON Schema (`z.toJSONSchema`) sent as `responseJsonSchema` | **plain JSON mode**: the prompt describes the format, zod validates + repairs afterwards |
   | Why | Gemini is forced into the exact shape; one schema = what we ask for **and** what we validate | With the big schema, the fast model put text in the wrong fields and sometimes looped until the token limit; JSON mode + validation was reliable |

2. **Gemini schema limits** (found the hard way, each returns `400 INVALID_ARGUMENT`): Gemini compiles a
   response schema into a state machine and rejects ones that get too big, e.g. an array of objects
   with a large `maxItems`. zod's default `.int()` bounds (±2⁵³) are also rejected. A unit test walks
   every enforced schema and fails if it breaks these rules.
3. **`maxOutputTokens` cap** (4,096 outline / 8,192 lesson): a runaway response fails in seconds
   instead of hanging a request for minutes.
4. **Defensive parsing:** strips ```` ```json ```` fences / surrounding prose if present.
5. **zod validation:** wrong types, 2 lessons instead of 3–5, too few valid MCQs, etc. are rejected.
6. **One retry** on invalid output, then a clean `502 AI_INVALID_RESPONSE`. Logs show the failing
   field or the finish reason (e.g. `MAX_TOKENS`).
7. **Error mapping:** Gemini 429 → `429 AI_RATE_LIMITED`, blocked by safety filters → `422 AI_BLOCKED`,
   missing key → `503 AI_NOT_CONFIGURED`. The SDK's default of 5 retries with up to 60 s
   back-off is reduced to 2 attempts + 60 s timeout so users never wait minutes.
8. Token usage and latency are logged for every call (`🤖 course outline: 1234 tokens in 4100ms`).

### Prompt design (`prompts.js`)

- A **system instruction** sets the persona (expert instructional designer) and the "raw JSON only" rule.
- User text is wrapped in `<learner_request>` tags and declared as data → mitigates prompt injection.
- Concrete rules: module/lesson counts, foundations → advanced ordering, a final applied module,
  no duplicates, specific lesson titles (with a good vs bad example), level-specific guidance.

## 6. Data model

```
Course 1 ──< Module 1 ──< Lesson          User (one per Auth0 account; Course.creator = User.auth0Id)
```

| Model | Key fields |
|---|---|
| **Course** | `title`, `description`, `creator` (Auth0 `sub`), `modules[]` → Module, `tags[]`, `prompt`, `level`, timestamps |
| **Module** | `title`, `description`, `course` → Course, `order`, `lessons[]` → Lesson |
| **User** | `auth0Id` (unique, = token `sub`), `name`, `email`, `picture`, `lastLoginAt` |
| **LessonAudio** | `lesson` (unique), `course` (cascade delete), `data` (MP3 Buffer), `mimeType` |
| **VideoCache** | `query` (unique, normalised), `video` (or `null` = nothing suitable), `expiresAt` (TTL index) |
| **Lesson** | `title`, `module` → Module, `course` → Course, `order`, `objectives[]`, `keyTopics[]`, `content[]` (flexible blocks), `resources[]`, `isEnriched`, `narration?` `{ transcript, durationSeconds, voice, generatedAt }` |

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

## 7. API reference (implemented)

| Method | Path | Body / notes | Success |
|---|---|---|---|
| GET | `/api/health` | DB status, uptime. **Public** | `200` |
| POST | `/api/courses/generate` | `{ prompt, level?, moduleCount? }`, rate-limited | `201 { course }` |
| GET | `/api/courses` | user's courses + `moduleCount`, `lessonCount`, `enrichedCount` | `200 { courses }` |
| GET | `/api/courses/:id` | course + modules + lesson titles (no content) | `200 { course }` |
| GET | `/api/courses/:id/export` | course + every lesson **with** content (for the course PDF) | `200 { course }` |
| DELETE | `/api/courses/:id` | cascades to modules + lessons | `204` |
| GET | `/api/lessons/:id` | one lesson (empty `content` until generated) | `200 { lesson }` |
| POST | `/api/lessons/:id/generate` | `{ force? }`, rate-limited; returns stored content if already generated | `200 { lesson }` |
| POST | `/api/lessons/:id/narration` | records the Hinglish narration once (rate-limited); `409` if the lesson has no content yet | `200 { narration }` |
| GET | `/api/lessons/:id/narration/audio` | the MP3 | `200 audio/mpeg` |
| PUT | `/api/users/me` | `{ name?, email?, picture? }`: create/update profile after login | `200 { user }` (with `stats`) |
| GET | `/api/users/me` | profile + `stats: { courses, lessonsGenerated }` | `200 { user }` |

Every route except `/api/health` requires `Authorization: Bearer <Auth0 access token>`, otherwise **401**.

Error shape (all endpoints): `{ "error": { "message": "...", "code": "VALIDATION_ERROR", "details": [...] } }`

## 8. Frontend

### Routes (React Router v7, declared in `main.jsx`)

```
/                                                   App (sidebar layout)
├── (index)                                         HomePage: Landing (logged out) or PromptForm + your courses
├── RequireAuth                                     login required for everything below
│   └── courses/:courseId                           CourseLayout: loads the course once
│       ├── (index)                                 CoursePage: overview + modules + lessons
│       └── module/:moduleIndex/lesson/:lessonIndex LessonPage (1-based numbers in the URL)
└── *                                               NotFoundPage
```

`CourseLayout` fetches the course **once** and passes it to the overview and every lesson through
`<Outlet context>`, so moving between lessons never refetches the course. When a lesson finishes
generating, `markLessonEnriched()` updates that shared copy and the outline's check marks update instantly.

### State & data fetching

- **`CoursesProvider` (Context):** the course list for the sidebar and home page. Loaded once the user is
  logged in (`idle` while logged out); after a create/delete it is updated locally instead of refetched.
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

### PDF export (`src/pdf/`)

Two exports: **Download PDF** on a lesson, and **Course PDF** on the course page (a small book: cover,
clickable contents, every generated lesson on its own pages, PDF bookmarks).

**Why `@react-pdf/renderer` (real PDF) instead of screenshotting the page (html2canvas + jsPDF)?**

| | Screenshot → PDF | `@react-pdf/renderer` (chosen) |
|---|---|---|
| Text | an image: blurry when zoomed, not selectable or searchable | real text: sharp, selectable, searchable |
| Page breaks | cut through lines and code | layout engine moves headings/boxes to the next page |
| Size | MBs (images) | ~10 KB per lesson |
| Links | not clickable | videos, readings and the contents page are clickable |

The PDF is built from the **same content blocks** as the web page (`LessonSection.jsx` mirrors
`LessonRenderer`) and the same inline parser (`utils/inlineFormat.js`), so web and PDF never disagree.
It is designed for paper: quiz questions without answers + an **answer key**, videos as links.

**Performance:** the PDF library is ~450 kB gzipped, so it is loaded with a dynamic `import()` only
when a download button is clicked (a separate chunk). Rendering happens in the browser (~200 ms for
a course), so the server spends nothing on it. The course PDF needs every lesson's content, which the
`/export` endpoint returns in one request instead of one request per lesson.

**Problems solved while building it (react-pdf quirks):**
- **Fonts:** the built-in PDF fonts (Helvetica, Courier) need no download but only cover Western
  characters. `pdf/text.js` turns `→` into `->`, `π` into `pi`, `≤` into `<=` and drops emoji, so AI text
  never prints as garbage.
- **Infinite layout loop:** a `break` (start a new page) on a View nested inside another View made
  the layout engine loop forever and crash the tab. Each lesson is now a direct child of the Page.
- **Code indentation:** react-pdf collapses leading spaces; they are converted to non-breaking spaces.
- **Page numbers:** text filled in after layout (`render` prop) is mis-placed when positioned with
  `bottom`, so it is positioned from the top of the A4 page instead.

### Security in rendering

**Videos** use a "lite embed": only the thumbnail is shown until the learner clicks play, then a
`youtube-nocookie.com` iframe loads. This saves ~1 MB of YouTube scripts per lesson and avoids tracking
cookies until playback. The `videoId` must match `/^[\w-]{11}$/` before it is put in the iframe URL.

AI text is **never** inserted as HTML. `InlineText` parses `**bold**`, `*italic*` and `` `code` ``
into React elements, so injected `<script>` or HTML in AI output is displayed as plain text.

## 9. Configuration

Validated once at startup by `server/config/env.js` (zod). Bad config → the server refuses to start
with a readable message, instead of failing on the first request.

| Variable | Where | Purpose |
|---|---|---|
| `MONGO_URI` | server | Atlas connection string (empty in dev → in-memory MongoDB) |
| `CLIENT_URL` | server | allowed CORS origin(s), comma-separated |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | server | AI access; model defaults to `gemini-3.5-flash-lite` |
| `GEMINI_TTS_MODEL`, `GEMINI_TTS_VOICE` | server | narration voice (defaults `gemini-3.8-flash-lite-tts`, `Kore`) |
| `AI_MOCK` | server | `true` = sample content instead of Gemini (dev only, rejected in production) |
| `YOUTUBE_API_KEY` | server | YouTube Data API v3 (optional; without it lessons link to a YouTube search) |
| `AUTH0_DOMAIN`, `AUTH0_AUDIENCE` | server | which tenant issues tokens and which API they must be for (required in production) |
| `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE` | client | Auth0 login settings (public by design: SPAs have no client secret) |
| `VITE_API_URL` | client | backend base URL (public, baked into the bundle) |

Secrets live **only** on the server. Anything prefixed `VITE_` ends up in public JavaScript.

## 10. Quality & tooling

- **Tests:** vitest + supertest against an in-memory MongoDB; the Gemini SDK is mocked, so tests
  are fast, free and deterministic. Covered: authentication (missing/forged/expired/wrong-audience
  tokens), data isolation between users, narration (script + TTS call shape, MP3 output, record-once,
  409 before content exists, cleanup on regenerate/delete), YouTube video selection/caching/quota errors (fake YouTube API
  via a stubbed `fetch`), validation, persistence, cascade delete, retry on
  invalid AI output, error mapping, JSON parsing, lesson caching, in-flight dedupe, block
  normalisation, and mock data staying in sync with the schemas.
- **Lint:** ESLint (server), oxlint (client).
- **CI:** GitHub Actions runs lint + tests (server) and lint + build (client) on every push/PR.
- **Git workflow:** one feature branch per phase, merged into `main` with `--no-ff`.

## 11. Roadmap

- [x] Phase 0: Monorepo scaffold, health check, CI
- [x] Phase 1: Models + AI course-outline generation
- [x] Phase 2: Frontend: prompt form, course page, lesson renderer + blocks, loading/error states
- [x] Phase 3: On-demand lesson generation (objectives, blocks, 4–5 MCQs, readings)
- [x] Phase 4: Auth0 login + per-user courses, user profiles, per-user rate limits
- [x] Phase 5: YouTube videos: real embeddable videos picked by the server, cached in MongoDB, lite embed
- [x] Phase 6: PDF export: lesson PDF + full-course PDF (cover, clickable contents, bookmarks, answer key)
- [x] Phase 7: Hinglish audio narration (Gemini script + TTS, MP3, stored once per lesson)
- [ ] Phase 8: Extras (progress tracking, dark mode, "ask a doubt" tutor, share links)
- [ ] Phase 9: Deploy (Render + Vercel), README, demo video
