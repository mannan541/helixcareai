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
| `OPENAI_API_KEY`  | Optional | For RAG embeddings |
| `GROQ_API_KEY`    | Optional | RAG chat primary. Get key: https://console.groq.com |
| `GROQ_MODEL`      | Optional | e.g. `llama-3.1-8b-instant` (default) |
| `GEMINI_API_KEY`  | Optional | RAG chat fallback when Groq fails/unset. Get key: https://aistudio.google.com/apikey |
| `GEMINI_MODEL`    | Optional | e.g. `gemini-2.0-flash` (default) |

**AI chat in production:** The app requires at least one of `GROQ_API_KEY` or `GEMINI_API_KEY` for the AI chat to work. Add it in the **backend** Vercel project:

1. Open [Vercel Dashboard](https://vercel.com) → select your **backend** project (the API, e.g. helixacareai backend).
2. Go to **Settings** → **Environment Variables**.
3. Add one of:
   - **GROQ:** Name `GROQ_API_KEY`, Value = your key from [console.groq.com](https://console.groq.com). Optionally `GROQ_MODEL` (e.g. `llama-3.1-8b-instant`).
   - **Gemini:** Name `GEMINI_API_KEY`, Value = your key from [Google AI Studio](https://aistudio.google.com/apikey). Optionally `GEMINI_MODEL` (e.g. `gemini-2.0-flash`).
4. Choose **Production** (and **Preview** if you use it), then **Save**.
5. **Redeploy** the backend (Deployments → latest → ⋮ → Redeploy) so the new variable is applied.

See `backend/.env.production.example` for a full checklist.

---

## Mobile (Flutter web)

**Important:** The API base URL is **baked in at build time**. So the **only** way to get production URL on live is to build with `mobile/.env` containing the production URL (from `.env.production`). Never run `flutter build web --release` for deploy without using production env first.

### Local development

- **File:** `mobile/.env` (copy from `mobile/.env.example`). This file is gitignored.
- **Purpose:** Point the app at your **local** backend only.
- **Base URL:** `http://localhost:3000` (or `http://10.0.2.2:3000` for Android emulator).

**Typical local `mobile/.env`:**
```env
API_BASE_URL=http://localhost:3000
```

Use this only for `flutter run` (Chrome, devices). Do **not** use this file when building for production deploy.

### Production build and deploy

- **File:** `mobile/.env.production` (committed). Must contain your **production** backend URL only.
- **Purpose:** Used when building the app for production. The built web app will call this URL (e.g. `https://helixacareai.vercel.app`).

**`mobile/.env.production`:**
```env
API_BASE_URL=https://helixacareai.vercel.app
```

**To build for production (required before every deploy):**  
Either run the script (recommended) or copy production env manually:

```bash
# From repo root — recommended (uses .env.production only)
./scripts/build-mobile-production.sh
```

Or manually:
```bash
cd mobile
cp .env.production .env
flutter build web --release
```

**To deploy to Vercel (build + deploy in one go):**
```bash
# From repo root
./scripts/deploy-mobile-vercel.sh
```

This script builds with **only** `.env.production` (so the live app never uses localhost) then runs `vercel --prod`.

---

## Summary

| Context        | Backend config                    | Mobile config              |
|----------------|-----------------------------------|----------------------------|
| **Local**      | `backend/.env` or `.env.development.local` (localhost DB, dev secrets) | `mobile/.env` → `API_BASE_URL=http://localhost:3000` |
| **Production** | Vercel Environment Variables (Production) — no .env file | `mobile/.env.production` → production API URL; used by CI when deploying |

Keep local env files (`.env`, `.env.development.local`) out of git; keep `.env.example` and `.env.production.example` (and `mobile/.env.production`) in git as templates and production defaults.
