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

The backend needs PostgreSQL (with pgvector). Use either **Docker** or a **remote DB (e.g. Neon)**.

**Option A — Docker (local Postgres)**

```bash
# From project root
./scripts/init-db.sh
```

Requires Docker. Starts Postgres on port 5432 and runs `database/schema.sql`.

**Option B — Neon (or other remote) for local dev**

If you already use Neon for Vercel, you can use the same DB locally:

1. In [Neon](https://neon.tech) (or your provider), copy the **connection string** (use the pooled one if offered).
2. In `backend/.env` set:
   ```env
   DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
   ```
3. Run the schema once (Neon SQL Editor or `psql "your-connection-string" -f database/schema.sql`).

**If you see `ECONNREFUSED 127.0.0.1:5432`** — nothing is listening on port 5432. Start Docker Postgres (Option A) or set `DATABASE_URL` in `backend/.env` to a remote DB (Option B), then restart the backend.

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: DATABASE_URL (local Postgres), JWT_SECRET, OPENAI_API_KEY (for RAG)
npm install
npm run build
npm run start
# Dev: npm run dev
```

API base URL: `http://localhost:3000`  
**API docs (Swagger):** [http://localhost:3000/api-docs](http://localhost:3000/api-docs) — test auth, children, sessions, chat, analytics from the browser.

### 3. Mobile

```bash
cd mobile
# Local dev: copy example and point to local backend
cp .env.example .env
# For local web/dev, API_BASE_URL is usually http://localhost:3000
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
- **Backend:** `npm run db:schema` — Apply `database/schema.sql`
- **Backend:** `npm run db:hard-delete` — Permanently remove records that were soft-deleted more than 7 days ago. Schedule daily (e.g. cron) if you use soft deletes.

## Branches & CI/CD

| Branch | Purpose | Vercel |
|--------|---------|--------|
| **main** | Production | Deploys to **production** (production URL) |
| **dev** | Testing / staging | Deploys to **preview** (unique preview URL per commit) |

- **CI** (`.github/workflows/ci.yml`): On every push/PR to `main` or `dev` — **backend only** (install + build).
- **Deploy** (`.github/workflows/deploy-vercel.yml`): On push to `main` or `dev` — **backend** (API) and **frontend** (Flutter web build) both deploy to Vercel. `main` → production; `dev` → preview.

To create and use the dev branch:

```bash
git checkout -b dev
git push -u origin dev
```

**GitHub Secrets** (Repo → **Settings** → **Secrets and variables** → **Actions** → **Repository secrets**) for Vercel deploy:

| Secret | How to get it |
|--------|----------------|
| `VERCEL_TOKEN` | [Vercel Account → Tokens](https://vercel.com/account/tokens) — create a token |
| `VERCEL_ORG_ID` | From [Vercel Dashboard](https://vercel.com) → your team/org → Settings → General, or from `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | **Backend** project ID. After `cd backend && npx vercel link`, see `.vercel/project.json` (or Project Settings → General) |
| `VERCEL_FRONTEND_PROJECT_ID` | **Frontend** (Flutter web) project ID. Create a second Vercel project (e.g. same repo, root dir `mobile`, or “Other” framework), then copy its Project ID from Settings → General. Required for the "Deploy Frontend" job — without it that job fails and only the backend deploy runs. |

You need **two Vercel projects**: one for the API (backend) and one for the web app (mobile). For the **backend** project, set **Root Directory** to **`backend`** in Project Settings → General (otherwise the build fails with `Cannot read properties of undefined (reading 'fsPath')`). See below to link mobile.

### Link mobile (Flutter web) to Vercel — create new project & get IDs

**Option A — Vercel Dashboard (recommended)**

1. Go to [vercel.com/new](https://vercel.com/new) and sign in.
2. **Import** your Git repository (e.g. `mannan541/helixcareai`).
3. Before deploying, click **Edit** next to “Root Directory” and set it to **`mobile`**.
4. **Framework Preset:** choose **Other** (we build Flutter web in CI; Vercel won’t run the build here).
5. **Build Command:** leave empty (or `echo "Built in CI"`). **Output Directory:** leave default (CI uses prebuilt output).
6. Click **Deploy**. The first deploy may fail; that’s OK.
7. Get the IDs:
   - Open the new project → **Settings** → **General**.
   - Copy **Project ID** (e.g. `prj_xxxxx`) → use as GitHub secret **`VERCEL_FRONTEND_PROJECT_ID`**.
   - **Org ID:** same as backend. In the left sidebar go to your **Team/Account** → **Settings** → **General** → copy **Team ID** or **User ID** (e.g. `team_xxxx` or `user_xxxx`). You already have this if backend is linked (see your backend `project.json`).

**Option B — Vercel CLI (creates project and writes IDs locally)**

1. In a terminal, from the **repo root**:
   ```bash
   cd mobile
   npx vercel link
   ```
2. When asked:
   - **Set up and deploy?** → **Y**
   - **Which scope?** → choose the same team/account as your backend.
   - **Link to existing project?** → **N** (we want a new project).
   - **What’s your project’s name?** → e.g. `HelixCareAI-web` or `HelixCareAI-mobile`.
3. After linking, the CLI creates `mobile/.vercel/project.json`. To see your **Project ID** and **Org ID**:
   ```bash
   cat mobile/.vercel/project.json
   ```
4. Add **Project ID** to GitHub as **`VERCEL_FRONTEND_PROJECT_ID`**. Use the same **Org ID** as backend for **`VERCEL_ORG_ID`** (if not set already).

**Your current backend IDs (same org for frontend)**  
From your existing backend link, **Org ID** is: `team_aumvi1YqIjR9fk4koGCgW5E9`. Use this for `VERCEL_ORG_ID` in GitHub. The **new** frontend project will have a different **Project ID** — get it from the dashboard (Option A) or from `mobile/.vercel/project.json` after `vercel link` (Option B).

## Database: Vercel Postgres (recommended)

The app uses **PostgreSQL with pgvector** (for RAG embeddings). Use a Postgres integration from the Vercel Marketplace so the backend gets a connection string automatically.

1. **Add Postgres to your backend project**
   - Open [Vercel Dashboard](https://vercel.com) → your **backend** project (e.g. HelixCareAI or helixcareai) → **Storage** tab (or **Integrations**).
   - Click **Create Database** / **Add Integration** and choose a **Postgres** provider (e.g. [Neon](https://vercel.com/marketplace/neon) — recommended; Vercel Postgres was migrated to Neon).
   - Connect it to this project. Vercel will inject **`POSTGRES_URL`** (and optionally `POSTGRES_URL_NON_POOLING`) into the project. The backend reads `POSTGRES_URL` when set.

2. **Run the schema**
   - After the database is created, run the schema once. From the integration’s dashboard, copy the connection string (use the **non-pooling** URL if you need to run migrations that use extensions like pgvector).
   - Locally:
     ```bash
     psql "<paste-connection-string>" -f database/schema.sql
     ```
   - Or from the provider’s SQL editor (Neon, etc.), run the contents of `database/schema.sql`.

3. **Local development**
   - In `backend/.env` set `DATABASE_URL` to your local Postgres (e.g. Docker) or the same Neon/Vercel DB URL. The app uses `POSTGRES_URL` on Vercel and `DATABASE_URL` locally.

## Deploy backend to Vercel (manual)

From the `backend` directory:

```bash
cd backend
npx vercel
```

Set these **Environment Variables** in the Vercel project (Dashboard → Project → Settings → Environment Variables):

| Variable | Description |
|----------|-------------|
| *(DB)* | Use **Vercel Postgres** (above): add Postgres from Marketplace; **`POSTGRES_URL`** is injected. No need to set `DATABASE_URL` on Vercel. |
| `JWT_SECRET` | Strong secret for signing tokens |
| `OPENAI_API_KEY` | OpenAI API key (for RAG chat) |
| `EMBEDDING_DIMENSION` | `1536` (for text-embedding-3-small) |

After deploy, the API base URL is `https://<your-project>.vercel.app`. Use it as `API_BASE_URL` in the mobile app.

### Production (Vercel) checklist

**Backend project** (e.g. HelixCareAI or helixcareai):

1. **Root Directory (required):** In **Settings → General**, set **Root Directory** to **`backend`**. If this is left empty, Vercel runs the build from the repo root and you may see `Error: Cannot read properties of undefined (reading 'fsPath')`. Apply and redeploy.
2. **Environment Variables:** In **Settings → Environment Variables**, set for **Production** (and Preview if needed):

- **POSTGRES_URL** — Injected automatically if you added Neon/Postgres from Storage/Integrations. Otherwise add the connection string.
- **JWT_SECRET** — A long random string (e.g. from a password generator).
- **OPENAI_API_KEY** — Your OpenAI API key (for RAG/chat).
- **EMBEDDING_DIMENSION** — `1536`.

**Frontend project** (e.g. HelixCareAI-frontend): No env vars required for the app to run; the production API URL is baked in at build time from `mobile/.env.production`. Optionally set **API_BASE_URL** in Vercel if you ever build from the dashboard.

## License

Proprietary — HelixCareAI
