// ============================================================
// HMAC Table Token Signing & Verification
// ============================================================

import crypto from 'node:crypto';
import { env } from '../config/env.js';

interface TableTokenPayload {
  cafeId: string;
  tableId: string;
}

/**
 * Sign a table token using HMAC-SHA256.
 * Format: base64url(JSON({cafeId, tableId})).signature
 */
export function signTableToken(payload: TableTokenPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', env.TABLE_TOKEN_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verify and decode a table token.
 * Returns the payload if valid, null if tampered/invalid.
 */
export function verifyTableToken(token: string): TableTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  if (!data || !signature) return null;

  const expectedSignature = crypto
    .createHmac('sha256', env.TABLE_TOKEN_SECRET)
    .update(data)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  // Buffers must have identical length for timingSafeEqual
  if (sigBuf.length !== expBuf.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (!decoded.cafeId || !decoded.tableId) return null;
    return decoded as TableTokenPayload;
  } catch {
    return null;
  }
}
