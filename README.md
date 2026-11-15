# Edify: Text-to-Learn

> Turn any topic into a structured, multi-module online course with AI.

Type a topic like *"Intro to React Hooks"* or *"Basics of Copyright Law"* and Edify generates a
complete course: 3–6 modules, 3–5 lessons each, with objectives, explanations, code examples,
videos and quizzes.

🚧 **Work in progress.** See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and roadmap.

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS v4, React Router |
| Backend | Node.js 22, Express 5, Mongoose, zod |
| AI | Google Gemini (structured JSON output) |
| Database | MongoDB Atlas |
| CI | GitHub Actions |

## Run it locally

Requirements: **Node.js 22+**.

```bash
# 1. Install everything (root, server, client)
npm run install:all

# 2. Configure the API and the app
cp server/.env.example server/.env          # add GEMINI_API_KEY, AUTH0_DOMAIN, AUTH0_AUDIENCE
cp client/.env.example client/.env.local    # add the VITE_AUTH0_* values
npm run check:ai --prefix server            # verifies the Gemini key + model work

# 3. Start API (http://localhost:5000) and app (http://localhost:5173) together
npm run dev
```

Leave `MONGO_URI` empty for local development and the API uses a temporary in-memory MongoDB.
No Gemini key yet? Set `AI_MOCK=true` in `server/.env` to use realistic sample content instead.

### Auth0 setup (free)

1. **Applications → Applications → Create Application** → *Single Page Web Applications*. In its
   Settings, set Allowed Callback URLs, Allowed Logout URLs and Allowed Web Origins to
   `http://localhost:5173` (add your Vercel URL later, comma-separated).
2. **Applications → APIs → Create API** with Identifier `https://edify-api` (RS256). In its
   Settings, enable **Allow Offline Access** (refresh tokens).
3. In the API's **Application Access** tab, authorize the Edify application for **user access**.
4. Copy the app's Domain + Client ID and the API Identifier into the two `.env` files.

## Scripts

| Command (from root) | What it does |
|---|---|
| `npm run dev` | runs server + client with live reload |
| `npm test` | server test suite (vitest + in-memory MongoDB) |
| `npm run lint` | lints server and client |
| `npm run build` | production build of the client |
