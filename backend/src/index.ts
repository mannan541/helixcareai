import express from 'express';
import cors from 'cors';
import { env } from './config/env';
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

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`HelixCareAI API listening on port ${env.PORT}`);
});
