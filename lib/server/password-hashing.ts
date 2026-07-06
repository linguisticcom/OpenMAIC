import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;

export type PortalPasswordVerification = {
  valid: boolean;
  needsUpgrade: boolean;
};

export function hashLegacyPortalPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function isLegacyPortalPasswordHash(passwordHash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(passwordHash);
}

export function hashPortalPasswordScrypt(password: string): string {
  const salt = randomBytes(16).toString('base64url');
  const hash = scryptSync(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  }).toString('base64url');
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${hash}`;
}

function safeBufferEqual(left: Buffer, right: Buffer): boolean {
  try {
    return left.length === right.length && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function verifyLegacyPasswordHash(passwordHash: string, password: string): boolean {
  if (!isLegacyPortalPasswordHash(passwordHash)) return false;
  return safeBufferEqual(
    Buffer.from(passwordHash, 'hex'),
    Buffer.from(hashLegacyPortalPassword(password), 'hex'),
  );
}

function verifyScryptPasswordHash(passwordHash: string, password: string): boolean {
  const [algorithm, nValue, rValue, pValue, salt, encodedHash] = passwordHash.split('$');
  if (algorithm !== 'scrypt' || !nValue || !rValue || !pValue || !salt || !encodedHash) {
    return false;
  }

  const n = Number(nValue);
  const r = Number(rValue);
  const p = Number(pValue);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  const expectedHash = Buffer.from(encodedHash, 'base64url');
  if (expectedHash.length === 0) return false;

  const actualHash = scryptSync(password, salt, expectedHash.length, { N: n, r, p });
  return safeBufferEqual(actualHash, expectedHash);
}

export function verifyPortalPassword(
  passwordHash: string,
  password: string,
): PortalPasswordVerification {
  if (passwordHash.startsWith('scrypt$')) {
    return { valid: verifyScryptPasswordHash(passwordHash, password), needsUpgrade: false };
  }

  const valid = verifyLegacyPasswordHash(passwordHash, password);
  return { valid, needsUpgrade: valid };
}
