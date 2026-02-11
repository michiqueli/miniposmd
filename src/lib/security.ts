import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const HASH_PREFIX = 'scrypt';

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(pin, salt, 64).toString('hex');
  return `${HASH_PREFIX}$${salt}$${derived}`;
}

export function verifyPin(rawPin: string, stored: string) {
  if (!stored) return false;

  if (!stored.startsWith(`${HASH_PREFIX}$`)) {
    // Legacy plain pin support
    return stored === rawPin;
  }

  const [, salt, expectedHex] = stored.split('$');
  if (!salt || !expectedHex) return false;

  const derivedHex = scryptSync(rawPin, salt, 64).toString('hex');
  const a = Buffer.from(derivedHex, 'hex');
  const b = Buffer.from(expectedHex, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isStrongPin(pin: string) {
  return /^\d{4,8}$/.test(pin);
}
