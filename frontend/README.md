# HelixCareAI — Web Frontend (React)

Responsive web client for HelixCareAI, replicating the Flutter mobile app's screens against the same backend API.

## Stack

- React 19 + TypeScript (Vite)
- React Router
- Axios (JWT bearer auth)
- Tailwind CSS v4
- Recharts (analytics charts)

## Screens

- Auth: login, register (with admin-approval flow), edit profile
- Dashboard: role-based tiles (admin / therapist / parent) + upcoming appointments
- Children: list w/ search, detail, add/edit (full profile, diagnosis, therapy, scores)
- Sessions: per-child list, log/edit form (therapy chips, time slot, metrics), detail w/ comments
- AI Assistant: per-child and global chat (RAG backend)
- Analytics: metric line charts + duration bars per child
- Reports: date-range report (attendance, performance, progress) + CSV export
- Appointments: booking with clinic slots & availability, parent schedule, therapist schedule (log session from appointment), admin approval queue, clinic slot management
- Admin: users list (filters, pending approvals, enable/disable/delete), add/edit user
- Notifications: list, mark read / mark all read

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # defaults to http://localhost:3000
npm run dev            # http://localhost:5173
```

Make sure the backend is running locally (`cd backend && npm run dev`).

## Build

```bash
npm run build          # uses .env.production (production API URL)
npm run preview
```

## Environment

| Variable            | Description          |
| ------------------- | -------------------- |
| `VITE_API_BASE_URL` | Backend API base URL |
