import CryptoJS from 'crypto-js';

const HASH_ITERATIONS = 10000;
const HASH_KEY_SIZE = 256 / 32;

export function hashPassword(password: string): string {
  const salt = CryptoJS.lib.WordArray.random(128 / 8).toString();
  return hashPasswordWithSalt(password, salt);
}

export function hashPasswordWithSalt(password: string, salt: string): string {
  const hash = CryptoJS.PBKDF2(password, salt, {
    keySize: HASH_KEY_SIZE,
    iterations: HASH_ITERATIONS,
  }).toString();

  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash) return false;

  const [salt, expectedHash] = storedHash.split(':');
  if (!salt || !expectedHash) return false;

  const actualHash = CryptoJS.PBKDF2(password, salt, {
    keySize: HASH_KEY_SIZE,
    iterations: HASH_ITERATIONS,
  }).toString();

  return actualHash === expectedHash;
}
