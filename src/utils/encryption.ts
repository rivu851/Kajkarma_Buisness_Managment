import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const hex = env.ENCRYPTION_KEY;
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return key;
}

export function encryptField(value: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptField(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 3) return payload;
  const [ivHex, tagHex, encHex] = parts;
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex!, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex!, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encHex!, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function maskAccountNumber(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const plain = value.includes(':') ? decryptField(value) : value;
  if (plain.length <= 4) return '****';
  return `****${plain.slice(-4)}`;
}
