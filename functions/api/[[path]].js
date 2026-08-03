import { handle } from 'hono/cloudflare-pages';
import { createApp } from './app.js';

const app = createApp();

export const onRequest = handle(app);
