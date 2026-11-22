// ============================================================
// Security Middleware — Helmet, CSRF, Security Headers
// ============================================================

import helmet from 'helmet';
import type { Request, Response, NextFunction } from 'express';

/** Helmet middleware with security headers */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://api.razorpay.com"],
      frameSrc: ["https://api.razorpay.com", "https://checkout.razorpay.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow loading images from other origins
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

/** CSRF protection for state-changing requests */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for API calls with Bearer auth (stateless)
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  // Skip for webhooks (verified by signature)
  if (req.path.startsWith('/api/webhooks/')) {
    return next();
  }

  // Skip for public auth endpoints (login, register, customer OTP, refresh)
  if (req.originalUrl?.startsWith('/api/auth/') || req.path?.startsWith('/api/auth/')) {
    return next();
  }

  // Skip for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // For cookie-based auth, check X-CSRF-Token header
  if (req.cookies?.access_token) {
    const csrfToken = req.headers['x-csrf-token'];
    const storedToken = req.cookies?.csrf_token;
    if (!csrfToken || !storedToken || csrfToken !== storedToken) {
      res.status(403).json({ error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token' } });
      return;
    }
  }

  next();
}

