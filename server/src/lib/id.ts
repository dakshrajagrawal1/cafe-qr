// ============================================================
// ULID / ID Generation
// ============================================================

import { ulid } from 'ulid';
import { randomBytes } from 'node:crypto';

/** Generate a new ULID for external-facing IDs */
export function generateId(): string {
  return ulid();
}

/** Generate a random numeric PIN of given length */
export function generatePin(length: number = 4): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

/** Generate a cryptographically random hex string */
export function generateSecret(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function generateSecretSync(bytes: number = 32): string {
  return randomBytes(bytes).toString('hex');
}
