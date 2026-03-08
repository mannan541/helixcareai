# Environment: Local vs Production

This project uses different configuration for **local development** and **production** (Vercel). Never commit real secrets; use `.env.example` / `.env.production.example` as templates only.

---

## Backend

### Local development

- **Files:** `backend/.env` or `backend/.env.development.local` (copy from `backend/.env.example`).
- **Purpose:** Local API URL, local Postgres (or Neon), dev JWT secret, optional OpenAI key.
- **Base URL:** The backend runs at `http://localhost:3000` (or the `PORT` you set).

**Typical local `.env`:**
- `NODE_ENV=development`
- `PORT=3000`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/helixcareai` (or your Neon URL)
- `JWT_SECRET=your-dev-secret`
- `OPENAI_API_KEY=...` (optional for RAG)

Override with `backend/.env.development.local` for machine-specific or secret values (this file is gitignored).

### Production (Vercel)

- **No `.env` file.** All production configuration is in **Vercel**.
- **Where:** Vercel Project → **Settings** → **Environment Variables**.
- **Environment:** Set variables for **Production** (and **Preview** if you want staging to use production DB).

**Set these for Production:**

| Variable          | Required | Notes |
|-------------------|----------|--------|
| `NODE_ENV`        | Optional | `production` |
| `PORT`            | Optional | Vercel sets this |
| `POSTGRES_URL` or `DATABASE_URL` | Yes | From Vercel Postgres or Neon |
| `JWT_SECRET`      | Yes      | Long random string; never use dev secret |
| `JWT_EXPIRES_IN`  | Optional | e.g. `7d` |
| `OPENAI_API_KEY`  | Optional | For RAG features |

See `backend/.env.production.example` for a full checklist.

---

## Mobile (Flutter web)

### Local development

- **File:** `mobile/.env` (copy from `mobile/.env.example`). This file is gitignored.
- **Purpose:** Point the app at your **local** backend.
- **Base URL:** `http://localhost:3000` (or `http://10.0.2.2:3000` for Android emulator).

**Typical local `mobile/.env`:**
```env
API_BASE_URL=http://localhost:3000
```

### Production build / CI deploy

- **File:** `mobile/.env.production` (committed).
- **Purpose:** Used by the **Deploy Frontend (main)** workflow and any production build. Must point at the **production** backend URL.
- **Base URL:** Your production API (e.g. `https://helixacareai.vercel.app`).

**`mobile/.env.production`:**
```env
API_BASE_URL=https://helixacareai.vercel.app
```

- **Local:** You use `mobile/.env` (localhost).
- **CI / production:** CI copies `mobile/.env.production` to `mobile/.env` before `flutter build web`, so the built app uses the production API and keys baked in at build time.

---

## Summary

| Context        | Backend config                    | Mobile config              |
|----------------|-----------------------------------|----------------------------|
| **Local**      | `backend/.env` or `.env.development.local` (localhost DB, dev secrets) | `mobile/.env` → `API_BASE_URL=http://localhost:3000` |
| **Production** | Vercel Environment Variables (Production) — no .env file | `mobile/.env.production` → production API URL; used by CI when deploying |

Keep local env files (`.env`, `.env.development.local`) out of git; keep `.env.example` and `.env.production.example` (and `mobile/.env.production`) in git as templates and production defaults.
