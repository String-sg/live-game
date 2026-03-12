import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const SCRYPT_PARAMS = { N: 65536, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

export async function hashPassphrase(passphrase: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const hash = (await scryptAsync(passphrase, salt, KEY_BYTES, SCRYPT_PARAMS)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassphrase(passphrase: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, hashHex] = parts;
  if (salt.length !== SALT_BYTES * 2 || hashHex.length !== KEY_BYTES * 2) return false;
  const storedHash = Buffer.from(hashHex, 'hex');
  const candidateHash = (await scryptAsync(passphrase, salt, KEY_BYTES, SCRYPT_PARAMS)) as Buffer;
  if (candidateHash.length !== storedHash.length) return false;
  return timingSafeEqual(candidateHash, storedHash);
}
