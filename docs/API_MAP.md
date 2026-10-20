# API Map

This document lists all backend endpoints and their usage. DO NOT invent endpoints/fields - use exactly as documented.

## Base
- Base URL: configured via `VITE_API_BASE_URL` (default http://localhost:3000)
- Auth: `Authorization: Bearer <token>` on protected routes

## Auth
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/auth/register | No | body: {email, password(min 8), fullName, role in ['therapist','parent']} - admin cannot self-register |
| POST | /api/auth/login | No | body: {email, password} -> {user, token} |
| GET | /api/auth/me | Yes | current user |
| GET | /api/auth/dashboard/counts | Yes | dashboard counts |
| GET | /api/auth/therapists | Yes | list therapists (parent can see mobile if showMobileToParents) |
| PATCH | /api/auth/profile | Yes | update profile, password, mobile, etc. |

## Admin
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/admin/users | Yes (admin) | list users |
| POST | /api/admin/users | Yes (admin) | create user |
| GET | /api/admin/users/:id | Yes (admin) | get user |
| PATCH | /api/admin/users/:id | Yes (admin) | update user |
| DELETE | /api/admin/users/:id | Yes (admin) | delete/disable user |
| POST | /api/admin/users/:id/approve | Yes (admin) | approve pending user |
| POST | /api/admin/users/:id/disable | Yes (admin) | disable user |
| POST | /api/admin/users/:id/enable | Yes (admin) | enable user |

## Children
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/children | Yes | list children |
| POST | /api/children | Yes | create child |
| GET | /api/children/:id | Yes | get child details |
| PATCH | /api/children/:id | Yes | update child |
| DELETE | /api/children/:id | Yes | soft delete/archive child |

## Sessions
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/sessions/child/:childId | Yes | list sessions for child |
| GET | /api/sessions/:id | Yes | get session |
| POST | /api/sessions | Yes | create session: {childId, sessionDate, therapistId?, durationMinutes?, notesText?, structuredMetrics? (object)} |
| PATCH | /api/sessions/:id | Yes | update session |
| DELETE | /api/sessions/:id | Yes | delete session |
| GET | /api/sessions/:id/comments | Yes | list comments |
| POST | /api/sessions/:id/comments | Yes | add comment (with optional rating) |
| PATCH | /api/sessions/:id/comments/:commentId | Yes | update comment |
| DELETE | /api/sessions/:id/comments/:commentId | Yes | delete comment |

## AI / RAG Chat
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/ai/chat | Yes | {childId, question} -> answer (RAG grounded) |
| POST | /api/ai/convert-notes | Yes | convert notes to structured metrics |
| POST | /api/ai/reindex/child/:childId | Yes | reindex child embeddings |
| POST | /api/ai/reindex/all | Yes | reindex all |
| POST | /api/ai/sync-missing | Yes | sync missing embeddings |

## Chat (alternative)
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/chat/ask | Yes | alternative chat endpoint (check which one is used) |

## Analytics
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/analytics | Yes | general analytics |
| GET | /api/analytics/clinic-summary | Yes | clinic summary |
| GET | /api/analytics/therapist-performance | Yes | therapist performance |
| GET | /api/analytics/children-progress | Yes | children progress |
| GET | /api/analytics/sessions-missing-notes | Yes | sessions missing notes |

## Appointments
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/appointments | Yes | list appointments |
| POST | /api/appointments | Yes | create appointment |
| GET | /api/appointments/:id | Yes | get appointment |
| PATCH | /api/appointments/:id | Yes | update/reschedule/cancel |
| DELETE | /api/appointments/:id | Yes | delete appointment |
| GET | /api/appointments/slots | Yes | get slots |
| POST | /api/appointments/slots | Yes (admin/therapist) | manage slots |

## Assessments
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/assessments/templates | Yes | list templates |
| GET | /api/assessments/templates/:id | Yes | get template |
| GET | /api/assessments | Yes | list assessments |
| POST | /api/assessments/start | Yes | start assessment |
| POST | /api/assessments/:id/submit | Yes | submit answers |
| GET | /api/assessments/:id/result | Yes | get result |
| GET | /api/assessments/custom | Yes | custom templates |
| POST | /api/assessments/custom | Yes | create custom template |

## Resources
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/resources | Yes | list resources |
| GET | /api/resources/:id | Yes | get resource |
| POST | /api/resources | Yes (admin/therapist) | create resource |
| PATCH | /api/resources/:id | Yes | update resource |
| DELETE | /api/resources/:id | Yes | delete resource |

## Reports
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/reports | Yes | list reports |
| POST | /api/reports/generate | Yes | generate report |
| GET | /api/reports/:id | Yes | get report |
| GET | /api/reports/:id/download | Yes | download report |

## Billing
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/billing/invoices | Yes | list invoices |
| GET | /api/billing/invoices/:id | Yes | get invoice |
| POST | /api/billing/invoices | Yes (admin) | create invoice |
| PATCH | /api/billing/invoices/:id | Yes (admin) | update invoice |
| POST | /api/billing/invoices/:id/pay | Yes | record payment |

## Notifications
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /api/notifications | Yes | list notifications |
| PATCH | /api/notifications/:id/read | Yes | mark read |
| POST | /api/notifications/read-all | Yes | mark all read |
| DELETE | /api/notifications/:id | Yes | delete notification |

## Notes
- Structured metrics are stored as JSONB in sessions. Need to inspect actual usage patterns from controllers/services.
- RAG uses /api/ai/chat with childId+question; also /api/chat/ask exists - will need to check which one the mobile uses. From ragService earlier and routes, /api/ai/chat is the RAG one.
