# NeuroNest — Project Overview & Concept Document

*This repository implements the NeuroNest concept under the product name **HelixCareAI**.*

---

# Part 1 — Basic Project Overview

## What This Repo Is

This is a **production-ready monorepo** for the NeuroNest therapy management and AI insight platform. It includes:

- **Mobile app** (Flutter) for therapists (and parents) to manage children, log sessions, view charts, and use an AI chatbot.
- **Backend API** (Node.js, Express, TypeScript) with JWT auth, role-based access, and an AI/RAG service.
- **Database** (PostgreSQL with pgvector) for users, children, sessions, embeddings, and chat logs.

## Tech Stack (Current Implementation)

| Layer      | Technologies |
|-----------|----------------|
| **Mobile** | Flutter, Bloc, Dio, Clean Architecture, feature-based structure |
| **Backend** | Node.js, Express, TypeScript, JWT, bcrypt, OpenAI |
| **Database** | PostgreSQL, pgvector, JSONB for structured metrics |
| **AI**      | RAG: embeddings (OpenAI) stored in pgvector; retrieval + LLM for chatbot |

## Repository Structure

```
project-root/
├── mobile/          # Flutter app (HelixCareAI)
├── backend/         # Express API
├── database/        # SQL schema (users, children, sessions, embeddings, chat_logs)
├── scripts/         # init-db, run-backend, run-mobile
├── docs/            # This document and other project docs
├── docker-compose.yml
└── README.md        # Setup and run instructions
```

## Roles & Access

- **Admin** — Full access; manage users and all children/sessions.
- **Therapist** — Own children and sessions; log sessions, view analytics, use chatbot.
- **Parent** — Own children only; view sessions, charts, and chatbot (aligned with Phase 2 in the concept).

## Quick Start (Summary)

1. **Database:** `docker compose up -d` then run `database/schema.sql` (e.g. `./scripts/init-db.sh`).
2. **Backend:** `cd backend`, copy `.env.example` to `.env`, set `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, then `npm install && npm run build && npm run start`.
3. **Mobile:** `cd mobile`, set `API_BASE_URL` in `.env`, then `flutter pub get && flutter run`.

See the root **README.md** for detailed setup and run commands.

---

# Part 2 — Full Concept Document

## Project Name (Working Title): *NeuroNest*

*(Replace with final brand name once confirmed)*

---

## 1️⃣ Executive Summary

**NeuroNest** is a mobile-based therapy management and AI insight platform designed for autistic children and their therapists.

The platform enables therapists to log structured daily session notes, track performance metrics over time, generate analytical reports, and leverage an AI-powered assistant to extract insights from historical therapy data.

The goal is to:

- Improve therapy documentation consistency  
- Enable measurable performance tracking  
- Provide data-backed insights  
- Support therapists in decision-making  
- Offer long-term progress visibility for parents  

This system combines structured therapy logging with AI-powered analysis using Retrieval-Augmented Generation (RAG).

---

## 2️⃣ Problem Statement

Current therapy documentation is:

- Manual and inconsistent  
- Stored in paper notes or spreadsheets  
- Difficult to analyze longitudinally  
- Not AI-assisted  
- Hard to convert into performance insights  

Therapists lack:

- Structured reporting tools  
- Historical pattern detection  
- Data-driven improvement tracking  
- Smart assistants grounded in real session notes  

---

## 3️⃣ Solution Overview

NeuroNest provides:

- 📱 Therapist mobile app  
- 👶 Child profile management  
- 📝 Structured session logging  
- 📊 Performance analytics dashboard  
- 📄 Automated report generation  
- 🤖 AI chatbot grounded in session history (RAG architecture)  

---

## 4️⃣ Target Users

1. Therapists  
2. Clinic administrators  
3. Parents (future phase)  
4. Therapy centers / special education institutions  

---

## 5️⃣ Core Features (MVP Scope)

### 5.1 Authentication & Roles

- Secure login (JWT-based)  
- Role-based access control:  
  - Admin  
  - Therapist  
  - Parent (Phase 2)  

### 5.2 Child Management

- Create child profile  
- Diagnosis details  
- Assigned therapist  
- Parent association  
- Therapy start date  

### 5.3 Session Logging

- Session date  
- Structured metrics (e.g., behavior scale, focus level, communication score)  
- Free-text therapist notes  
- Progress tagging  
- Session history view  

### 5.4 Performance Tracking

- Visual charts (weekly/monthly)  
- Improvement trends  
- Regression detection  
- Aggregated performance summaries  

### 5.5 AI Chatbot (RAG-Based)

Therapist can ask:

- “How has communication improved over 3 months?”  
- “What patterns do you see in attention issues?”  
- “Summarize last 10 sessions.”  
- “Generate parent-friendly progress summary.”  

System will:

1. Retrieve relevant session notes  
2. Provide grounded answer  
3. Avoid hallucination  
4. Reference actual data  

### 5.6 Reports

- Monthly progress report  
- Performance summaries  
- PDF export  
- AI-generated summaries  

---

## 6️⃣ Technical Architecture

### 📱 Frontend (Mobile)

**Technology:**  
- Flutter  
- Bloc (State Management)  
- Dio (API communication)  
- *Navigation: Navigator (go_router can be added)*  

**Architecture:**  
- Feature-based folder structure  
- Clean Architecture principles  
- Modular Bloc pattern  

### 🧠 Backend

**Technology:**  
- Node.js  
- Express  
- TypeScript  
- JWT Authentication  
- Role-based Middleware  

**Architecture:**  
- Modular structure (auth, children, sessions, chat, analytics)  
- REST API  
- Service-based logic separation  
- AI service layer (embeddings + RAG)  

### 🗄 Database

**Primary Database:** PostgreSQL  

**Extensions:**  
- pgvector (for AI embeddings)  
- JSONB for structured metrics  

**Core Tables:**  
- users  
- children  
- sessions  
- embeddings  
- chat_logs  

### 🤖 AI Architecture

**Method:** Retrieval-Augmented Generation (RAG)  

**Flow:**  

1. Therapist writes session note  
2. Backend:  
   - Saves session  
   - Generates embedding  
   - Stores embedding in PostgreSQL  
3. When chatbot is queried:  
   - Convert question to embedding  
   - Retrieve relevant notes (e.g. top 5 by similarity for that child)  
   - Send context + question to LLM  
   - Return grounded response  
   - Store chat log  

---

## 7️⃣ Security & Privacy

Since this involves children:

- Encrypted database backups (operational responsibility)  
- HTTPS only communication  
- Password hashing (bcrypt)  
- Role-based data isolation  
- Activity logging (can be extended)  
- Environment variable protection  
- Secure token expiration  

Future compliance readiness:

- HIPAA-like structure (if scaling globally)  

---

## 8️⃣ Scope of Work (Development Phases)

### Phase 1 – MVP (8 Weeks)

| Week    | Focus |
|---------|--------|
| 1–2     | Project setup, Auth, Role management, Child CRUD |
| 3–4     | Session logging, Structured metrics, Backend validation |
| 5       | Performance charts, Aggregation logic |
| 6       | AI embeddings integration, pgvector setup |
| 7       | Chatbot RAG implementation, Chat log storage |
| 8       | Report generation, Testing, Security hardening, Deployment |

### Phase 2 – Expansion

- Parent portal  
- Multi-clinic support  
- AI regression alerts  
- Predictive insights  
- Admin analytics dashboard  
- Subscription billing  

---

## 9️⃣ Folder Structure Overview

**Root project:**

```
project-root/
├── mobile/
├── backend/
├── database/
├── docs/
├── scripts/
├── docker-compose.yml
└── README.md
```

---

## 🔟 Future Scalability

This system can evolve into:

- SaaS platform for therapy centers  
- Subscription-based product  
- Government partnership solution  
- AI-assisted diagnostic support (future)  
- Multilingual support  

---

## 1️⃣1️⃣ Monetization Model

Potential models:

- Per therapist subscription  
- Per child subscription  
- Clinic license model  
- Tier-based AI access  
- Enterprise custom deployment  

---

## 1️⃣2️⃣ Estimated Tech Resources

- 1 Full-stack engineer (Flutter + Node)  
- 1 AI integration engineer (optional)  
- 1 UI/UX designer (initial phase)  
- 1 QA tester (final phase)  

---

## 1️⃣3️⃣ Risk Analysis

| Risk                 | Mitigation        |
|----------------------|-------------------|
| AI hallucination     | RAG grounding     |
| Data breach          | Encryption & RBAC |
| Low therapist adoption | UX simplicity  |
| Scaling issues       | Modular backend   |

---

## 1️⃣4️⃣ Vision

To become the leading AI-assisted therapy management platform for neurodivergent children, empowering therapists with data-driven insights and improving long-term developmental outcomes.

---

*Document version: 1.0 — Aligned with current HelixCareAI/NeuroNest monorepo implementation.*
