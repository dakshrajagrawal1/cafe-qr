import { describe, it, expect, beforeEach } from 'vitest';
import { signTableToken, verifyTableToken } from '../src/lib/hmac.js';

describe('Table Token HMAC Security', () => {
  const samplePayload = {
    cafeId: 'cafe_12345',
    tableId: 'table_67890',
  };

  it('signs and verifies a valid table token', () => {
    const token = signTableToken(samplePayload);
    expect(token).toBeDefined();
    expect(token).toContain('.');

    const decoded = verifyTableToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.cafeId).toBe(samplePayload.cafeId);
    expect(decoded?.tableId).toBe(samplePayload.tableId);
  });

  it('rejects tampered table token payload', () => {
    const token = signTableToken(samplePayload);
    const [data, sig] = token.split('.');

    // Tamper with the payload data (e.g. changing tableId)
    const tamperedPayload = { cafeId: 'cafe_12345', tableId: 'table_HACKED' };
    const tamperedData = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url');
    const tamperedToken = `${tamperedData}.${sig}`;

    const decoded = verifyTableToken(tamperedToken);
    expect(decoded).toBeNull();
  });

  it('rejects tampered signature', () => {
    const token = signTableToken(samplePayload);
    const [data] = token.split('.');
    const invalidSignature = 'invalid_signature_bits_here';
    const tamperedToken = `${data}.${invalidSignature}`;

    const decoded = verifyTableToken(tamperedToken);
    expect(decoded).toBeNull();
  });

  it('rejects malformed token formats', () => {
    expect(verifyTableToken('')).toBeNull();
    expect(verifyTableToken('single_part_token')).toBeNull();
    expect(verifyTableToken('part1.part2.part3')).toBeNull();
  });
});

