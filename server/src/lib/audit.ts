// ============================================================
// Audit Log Helper
// ============================================================

import prisma from './prisma.js';
import type { Request } from 'express';

interface AuditEntry {
  cafeId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  req?: Request;
}

/**
 * Log a sensitive action to the audit log.
 * Fire-and-forget — does not throw on failure.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        cafeId: entry.cafeId ?? null,
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        oldValue: entry.oldValue ? JSON.parse(JSON.stringify(entry.oldValue)) : undefined,
        newValue: entry.newValue ? JSON.parse(JSON.stringify(entry.newValue)) : undefined,
        ipAddress: entry.req?.ip ?? entry.req?.socket?.remoteAddress ?? null,
        userAgent: entry.req?.get('user-agent')?.substring(0, 500) ?? null,
      },
    });
  } catch (error) {
    // Log but don't crash — audit logging should never break the main flow
    console.error('[AUDIT] Failed to write audit log:', error);
  }
}

