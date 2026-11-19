import { withTransaction, type UserAttributes } from '../db/index.js';
import { userRepository } from '../db/repositories/user.repository.js';
import { hashPassword, signToken, verifyPassword } from '../utils/auth.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../utils/errors.js';

export interface AuthInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: UserAttributes;
}

export async function registerUser(input: AuthInput): Promise<UserAttributes> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new ValidationError('Email is required');
  }
  if (!input.password || input.password.length < 6) {
    throw new ValidationError('Password must be at least 6 characters');
  }

  const passwordHash = await hashPassword(input.password);

  return withTransaction(async () => {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('Email already exists');
    }

    return userRepository.create({ email, passwordHash });
  });
}

export async function loginUser(input: AuthInput): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const isValid = await verifyPassword(input.password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const token = await signToken({
    sub: user.id,
    email: user.email,
  });

  return { token, user };
}
