# HelixCareAI — Autism Therapy Platform

**Project name: HelixCareAI**

Production-ready monorepo for the HelixCareAI autism therapy management platform: mobile app, backend API, and AI-powered RAG chatbot.

**📘 [Project overview & full concept document (NeuroNest)](docs/PROJECT_OVERVIEW_AND_CONCEPT.md)** — Executive summary, problem/solution, features, architecture, security, phases, and vision (HelixCareAI implementation).

## Stack

| Layer | Technology |
|-------|------------|
| Mobile | Flutter, Bloc, Dio, Clean Architecture |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL with pgvector |
| AI | RAG (embeddings + LLM) for session-grounded chat |

## Prerequisites

- **Mobile**: Flutter SDK 3.x, Dart 3.x
- **Backend**: Node.js 20+, npm/pnpm
- **Database**: Docker (for PostgreSQL) or local PostgreSQL 15+ with pgvector

## Quick Start

### 1. Database

```bash
# Start PostgreSQL with pgvector
docker compose up -d

# Run migrations (from project root)
cd database && psql -h localhost -U postgres -d helixcareai -f schema.sql
# Or use the init script if using Docker default credentials
./scripts/init-db.sh
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, OPENAI_API_KEY (for RAG)
npm install
npm run build
npm run start
# Dev: npm run dev
```

API base URL: `http://localhost:3000`

### 3. Mobile

```bash
cd mobile
cp .env.example .env
# Set API_BASE_URL to your backend URL (e.g. http://10.0.2.2:3000 for Android emulator)
flutter pub get
flutter run
```

## Project Structure

```
.
├── mobile/                 # Flutter app (HelixCareAI)
│   ├── lib/
│   │   ├── core/           # DI, errors, network, theme
│   │   ├── features/       # Feature-based modules
│   │   └── main.dart
│   └── ...
├── backend/                # Express API
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── modules/        # auth, users, children, sessions, chat, ai
│   │   └── index.ts
│   └── ...
├── database/
│   ├── schema.sql         # Full schema + pgvector
│   └── migrations/        # Optional versioned migrations
├── scripts/               # init-db, run-backend, run-mobile
├── docker-compose.yml
└── README.md
```

## Roles & Access

| Role | Access |
|------|--------|
| **admin** | Full access; manage users, children, all sessions |
| **therapist** | Own children/sessions; create sessions, view charts, chat |
| **parent** | Own children only; view sessions, charts, chat |

## Environment Variables

- **Backend** (`backend/.env`): See `backend/.env.example`
- **Mobile** (`mobile/.env`): See `mobile/.env.example`

## Scripts

- `./scripts/init-db.sh` — Create DB and run schema (requires Docker)
- `./scripts/run-backend.sh` — Start backend (dev)
- `./scripts/run-mobile.sh` — Run Flutter app

## Branches & CI/CD

| Branch | Purpose | Vercel |
|--------|---------|--------|
| **main** | Production | Deploys to **production** (production URL) |
| **dev** | Testing / staging | Deploys to **preview** (unique preview URL per commit) |

- **CI** (`.github/workflows/ci.yml`): On every push/PR to `main` or `dev` — backend build, mobile `flutter analyze`.
- **Deploy** (`.github/workflows/deploy-vercel.yml`): On push to `main` → Vercel production; on push to `dev` → Vercel preview.

To create and use the dev branch:

```bash
git checkout -b dev
git push -u origin dev
```

**GitHub Secrets** (Repo → Settings → Secrets and variables → Actions) for Vercel deploy:

| Secret | How to get it |
|--------|----------------|
| `VERCEL_TOKEN` | [Vercel Account → Tokens](https://vercel.com/account/tokens) — create a token |
| `VERCEL_ORG_ID` | After `cd backend && npx vercel link`, from `.vercel/project.json` or [Vercel Dashboard → Project Settings → General](https://vercel.com/docs/concepts/projects/overview#project-id) |
| `VERCEL_PROJECT_ID` | Same as above (in `.vercel/project.json` after `vercel link`) |

Link the backend once locally so the project exists on Vercel and you have the IDs: `cd backend && npx vercel link` (choose your org and create/link the project).

## Deploy backend to Vercel (manual)

From the `backend` directory:

```bash
cd backend
npx vercel
```

Set these **Environment Variables** in the Vercel project (Dashboard → Project → Settings → Environment Variables):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (use a serverless-friendly DB e.g. [Neon](https://neon.tech), [Vercel Postgres](https://vercel.com/storage/postgres), or [Supabase](https://supabase.com)) |
| `JWT_SECRET` | Strong secret for signing tokens |
| `OPENAI_API_KEY` | OpenAI API key (for RAG chat) |
| `EMBEDDING_DIMENSION` | `1536` (for text-embedding-3-small) |

After deploy, the API base URL is `https://<your-project>.vercel.app`. Use it as `API_BASE_URL` in the mobile app.

## License

Proprietary — HelixCareAI
