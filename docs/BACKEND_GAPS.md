# Backend Gaps

Document any missing endpoints or fields discovered during exploration.

## Potential Gaps to Verify

- [ ] Does backend support password reset/forgot password? (Not obvious in auth routes - may not be implemented)
- [ ] Does backend support refresh tokens? (Not seen in auth)
- [ ] Does /api/chat/ask differ from /api/ai/chat in implementation? (Both exist)
- [ ] Are there any streaming/SSE endpoints for chat? (Need to check ai/chat implementation)
- [ ] What is the exact shape of structured_metrics for different session types? (JSONB - need to infer from UI/mobile or see examples)
- [ ] Are there export endpoints for CSV/PDF? (Reports have download, but analytics export?)
- [ ] Websocket/real-time for notifications? (Polling assumed if not present)
- [ ] Audit log endpoints? (audit service exists but may not have public routes - check admin routes)

## Gaps Found So Far
(Will fill as we explore more deeply)
