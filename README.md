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

## License

Proprietary — HelixCareAI
