import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { sign, verify } from 'hono/jwt';
import { UnauthorizedError } from '../application/errors.js';
import type { PasswordHasher, TokenPayload, TokenService } from '../application/ports.js';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  async verify(password: string, hash: string): Promise<boolean> {
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
}

export class HonoJwtTokenService implements TokenService {
  constructor(
    private readonly secret: string,
    private readonly ttlSeconds: number = 60 * 60 * 24,
  ) {}

  async sign(payload: TokenPayload): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return sign(
      {
        sub: payload.sub,
        email: payload.email,
        iat: now,
        exp: now + this.ttlSeconds,
      },
      this.secret,
      'HS256',
    );
  }

  async verify(token: string): Promise<TokenPayload> {
    try {
      const decoded = await verify(token, this.secret, 'HS256');
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
}
