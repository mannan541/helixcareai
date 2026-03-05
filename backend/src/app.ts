import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import childrenRoutes from './modules/children/children.routes';
import sessionsRoutes from './modules/sessions/sessions.routes';
import chatRoutes from './modules/chat/chat.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);

app.get('/', (_req, res) => res.json({ name: 'HelixCareAI API', status: 'ok', docs: '/health' }));
app.get('/api', (_req, res) => res.json({ name: 'HelixCareAI API', status: 'ok', docs: '/health' }));
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

export default app;
