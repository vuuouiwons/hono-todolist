import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { sign, verify } from 'hono/jwt';
import { UnauthorizedError } from './errors.js';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const DEFAULT_JWT_SECRET = 'hono-pragmatic-dev-secret-change-in-prod';
const DEFAULT_JWT_TTL_SECONDS = 60 * 60 * 24;

export interface TokenPayload {
  sub: number;
  email: string;
}

function getJwtSecret(overrideSecret?: string): string {
  return overrideSecret ?? process.env.JWT_SECRET ?? DEFAULT_JWT_SECRET;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parts = hash.split(':');
  if (parts.length !== 2) {
    return false;
  }

  const [salt, keyHex] = parts;
  const expectedKey = Buffer.from(keyHex, 'hex');
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  if (expectedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(expectedKey, derivedKey);
}

export async function signToken(
  payload: TokenPayload,
  options?: { secret?: string; ttlSeconds?: number },
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const ttl = options?.ttlSeconds ?? DEFAULT_JWT_TTL_SECONDS;
  return sign(
    {
      sub: payload.sub,
      email: payload.email,
      iat: now,
      exp: now + ttl,
    },
    getJwtSecret(options?.secret),
    'HS256',
  );
}

export async function verifyToken(token: string, overrideSecret?: string): Promise<TokenPayload> {
  try {
    const decoded = await verify(token, getJwtSecret(overrideSecret), 'HS256');
    const sub = Number(decoded.sub);
    const email = decoded.email;

    if (!Number.isInteger(sub) || sub <= 0 || typeof email !== 'string') {
      throw new UnauthorizedError('Invalid token payload');
    }

    return { sub, email };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid or expired JWT token');
  }
}
