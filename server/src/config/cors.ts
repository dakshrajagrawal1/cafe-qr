import { env } from './env.js';
import type { CorsOptions } from 'cors';

export const corsOptions: CorsOptions = {
  origin: env.CORS_ORIGINS.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 600, // 10 minutes
};

