import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyWebhookSignature } from '../src/modules/subscription/webhook.util.js';

describe('Razorpay Webhook Verification', () => {
  const secret = 'test_webhook_secret_key_12345';
  const payload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_123456789',
          order_id: 'order_test_987654321',
          amount: 199900,
          currency: 'INR',
          status: 'captured',
          notes: {
            subscription_id: 'sub_test_123',
            cafe_id: 'cafe_test_123',
          },
        },
      },
    },
  };

  it('rejects webhook with invalid signature', () => {
    const invalidSignature = 'invalid_hex_signature';
    const isValid = verifyWebhookSignature(payload, invalidSignature, secret);
    expect(isValid).toBe(false);
  });

  it('rejects webhook when payload is modified (tamper protection)', () => {
    const originalBody = JSON.stringify(payload);
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(originalBody)
      .digest('hex');

    // Modify payload (e.g. attacker changing amount or subscription_id)
    const tamperedPayload = {
      ...payload,
      payload: {
        payment: {
          entity: {
            ...payload.payload.payment.entity,
            amount: 100, // attacker tried to pay ₹1 instead of ₹1999
          },
        },
      },
    };

    const isValid = verifyWebhookSignature(tamperedPayload, validSignature, secret);
    expect(isValid).toBe(false);
  });

  it('accepts correctly signed webhook payload', () => {
    const bodyStr = JSON.stringify(payload);
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(bodyStr)
      .digest('hex');

    const isValid = verifyWebhookSignature(payload, validSignature, secret);
    expect(isValid).toBe(true);
  });
});
