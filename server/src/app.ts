import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'node:path';
import { corsOptions, env } from './config/index.js';
import {
  securityHeaders,
  csrfProtection,
  errorHandler,
  generalLimiter,
} from './middleware/index.js';

// Route modules
import authRoutes from './modules/auth/auth.routes.js';
import cafeRoutes from './modules/cafe/cafe.routes.js';
import verificationRoutes from './modules/verification/verification.routes.js';
import menuRoutes from './modules/menu/menu.routes.js';
import tablesRoutes from './modules/tables/tables.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';
import uploadRoutes from './modules/upload/upload.routes.js';
import realtimeRoutes from './modules/realtime/realtime.routes.js';
import subscriptionRoutes from './modules/subscription/subscription.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import webhookRoutes from './modules/webhook/webhook.routes.js';
import customerRoutes from './modules/customer/customer.routes.js';
import ordersRoutes from './modules/orders/orders.routes.js';
import kitchenRoutes from './modules/kitchen/kitchen.routes.js';
import waiterRoutes from './modules/waiter/waiter.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import businessDayRoutes from './modules/business-day/business-day.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import offersRoutes from './modules/offers/offers.routes.js';

export function createApp() {
  const app = express();

  // Security headers & CORS
  app.use(securityHeaders);
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // CSRF protection for cookie-based state-changing requests
  app.use(csrfProtection);

  // Serve uploaded public images
  const imagesPath = path.resolve(env.UPLOAD_DIR, 'images');
  app.use('/uploads/images', express.static(imagesPath));

  // Customer direct QR scan redirect
  app.get('/c/:slug', (req, res) => {
    const customerBase = env.CUSTOMER_APP_URL || 'http://localhost:5173';
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(`${customerBase}/c/${req.params.slug}${query}`);
  });

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
    });
  });

  // Webhooks (bypass general rate limits)
  app.use('/api/webhooks', webhookRoutes);

  // Apply general rate limiter to remaining /api routes
  app.use('/api', generalLimiter);

  // Mount API route modules
  app.use('/api/auth', authRoutes);
  app.use('/api/cafe', cafeRoutes);
  app.use('/api/verification', verificationRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api/tables', tablesRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/realtime', realtimeRoutes);
  app.use('/api/subscription', subscriptionRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/customer', customerRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/kitchen', kitchenRoutes);
  app.use('/api/waiter', waiterRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/business-day', businessDayRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/offers', offersRoutes);

  // 404 handler for unmatched API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`,
      },
    });
  });

  // Central error handling middleware
  app.use(errorHandler);

  return app;
}
