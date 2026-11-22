// ============================================================
// Express Request Type Augmentation
// ============================================================

import type { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user info (set by auth middleware) */
      user?: {
        id: string;
        email: string;
        role: UserRole;
        cafeId: string | null;
        name: string;
        permissions: Record<string, boolean> | null;
      };

      /** Cafe ID for tenant-scoped requests (set by tenant middleware) */
      cafeId?: string;

      /** Customer info (set by customer auth middleware) */
      customer?: {
        id: string;
        phone: string;
        name: string;
        deviceToken: string;
      };
    }
  }
}

export {};

