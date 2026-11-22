// ============================================================
// Webhook Signature Verification Helper
// ============================================================

import crypto from 'node:crypto';

/**
 * Pure function: Verify Razorpay webhook signature using HMAC-SHA256.
 * Returns true if valid, false if invalid or tampered.
 */
export function verifyWebhookSignature(
  rawBody: string | object,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(bodyStr)
    .digest('hex');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expBuf);
}
