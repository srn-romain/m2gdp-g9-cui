import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './env';
import { apiError } from './errors';
import { authRoutes } from './routes/auth';
import { meRoutes } from './routes/me';
import { tablesRoutes } from './routes/tables';
import { participationsRoutes } from './routes/participations';
import { messagesRoutes } from './routes/messages';
import { avatarRoutes } from './routes/avatar';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: (origin, c) => {
    const env = c.env as Env;
    const extra = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const allow = ['http://localhost:5173', 'http://localhost:5001', ...extra];
    if (!origin) return origin;
    if (allow.includes(origin)) return origin;
    if (/^https:\/\/([a-z0-9-]+\.)*web\.app$/.test(origin)) return origin;
    return null;
  },
}));

app.get('/api/health', (c) => c.json({ ok: true, service: 'labonnetablee-api', version: 'v1' }));

const v1 = new Hono<{ Bindings: Env }>();
v1.route('/auth', authRoutes);
v1.route('/me', meRoutes);
v1.route('/tables', tablesRoutes);
v1.route('/', participationsRoutes);
v1.route('/', messagesRoutes);
v1.route('/avatar', avatarRoutes);
app.route('/api/v1', v1);

app.notFound((c) => apiError('NOT_FOUND', 'Route introuvable.'));
app.onError((e, c) => {
  console.error(e);
  return apiError('INTERNAL_ERROR', 'Erreur interne.');
});

export default app;
