import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorMiddleware } from './middleware/error.js';
import { servicesMiddleware } from './middleware/services.js';
import { sessionMiddleware } from './middleware/session.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/user.js';
import { gachaRoutes } from './routes/gacha.js';
import { libraryRoutes } from './routes/library.js';
import { adminRoutes } from './routes/admin.js';
import { publicRoutes } from './routes/public.js';

export function createApp() {
  const app = new Hono().basePath('/api');

  app.use(cors({
    allowHeaders: ['Content-Type', 'Authorization', 'X-User-ID', 'X-Session-Token', 'X-Admin-Mode'],
    maxAge: 86400,
  }));
  app.use(servicesMiddleware);
  app.use(sessionMiddleware);
  app.onError(errorMiddleware);
  app.notFound((c) => c.json({ success: false, error: '未知的API端点' }, 404));

  app.route('/auth', authRoutes);
  app.route('/user', userRoutes);
  app.route('/', gachaRoutes);
  app.route('/library', libraryRoutes);
  app.route('/admin', adminRoutes);
  app.route('/', publicRoutes);

  return app;
}
