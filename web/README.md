# HelixCareAI Web

Web front-end for HelixCareAI (NeuroNest) - Autism therapy management and AI insight platform.

## Tech Stack

- React 18 + TypeScript (strict)
- Vite
- Tailwind CSS + shadcn/ui
- React Router v6
- TanStack Query
- Zustand
- Axios
- React Hook Form + Zod

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your backend URL:
```env
VITE_API_BASE_URL=http://localhost:3000
```

4. Run development server:
```bash
npm run dev
```

The app will be available at http://localhost:5173

## Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
  app/            # Router, providers, layouts, guards
  core/           # API client, auth, config, utils, types
  components/     # Shared components and UI primitives
  features/       # Feature-based modules (auth, children, sessions, etc.)
  lib/            # Utilities
```
