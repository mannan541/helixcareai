import express, { Request } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHandler';
import openApiSpec from './openapi.json';
import authRoutes from './modules/auth/auth.routes';
import adminRoutes from './modules/admin/admin.routes';

function specWithServer(req: Request): typeof openApiSpec & { servers: Array<{ url: string; description: string }> } {
  const baseUrl = `${req.protocol}://${req.get('host') ?? 'localhost:3000'}`;
  return { ...openApiSpec, servers: [{ url: baseUrl, description: 'This server' }] };
}
import childrenRoutes from './modules/children/children.routes';
import sessionsRoutes from './modules/sessions/sessions.routes';
import chatRoutes from './modules/chat/chat.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';

const app = express();

// Allow Flutter web, frontend/backend Vercel hosts, and localhost (including Swagger UI same-origin)
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed =
        !origin ||
        /^https:\/\/(helixcareaifrontend|mobile|hlixacareai)(-\w+)?\.vercel\.app$/i.test(origin) ||
        /^http:\/\/localhost(:\d+)?$/i.test(origin) ||
        /^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin);
      cb(null, allowed ? origin || true : false);
    },
    credentials: true,
  })
);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/api-docs/spec', (req, res) => res.json(specWithServer(req)));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(null, { customSiteTitle: 'HelixCareAI API', swaggerOptions: { url: '/api-docs/spec' } }));

app.get('/', (_req, res) => res.json({ name: 'HelixCareAI API', status: 'ok', docs: '/api-docs', health: '/health' }));
app.get('/api', (_req, res) => res.json({ name: 'HelixCareAI API', status: 'ok', docs: '/api-docs', health: '/health' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

export default app;
