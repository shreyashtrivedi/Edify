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

# 2. Configure the API
cp server/.env.example server/.env      # then add your GEMINI_API_KEY
npm run check:ai --prefix server        # verifies the key + model work

# 3. Start API (http://localhost:5000) and app (http://localhost:5173) together
npm run dev
```

Leave `MONGO_URI` empty for local development and the API uses a temporary in-memory MongoDB.
No Gemini key yet? Set `AI_MOCK=true` in `server/.env` to use realistic sample content instead.

## Scripts

| Command (from root) | What it does |
|---|---|
| `npm run dev` | runs server + client with live reload |
| `npm test` | server test suite (vitest + in-memory MongoDB) |
| `npm run lint` | lints server and client |
| `npm run build` | production build of the client |
