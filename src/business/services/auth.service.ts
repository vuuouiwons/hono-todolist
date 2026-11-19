import { hashPassword, signToken, verifyPassword } from '../../shared/auth.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../../shared/errors.js';
import type { UserModel } from '../models/user.model.js';
import type { IUserRepository } from '../repositories/IUserRepository.js';

export interface AuthInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: UserModel;
}

export class AuthService {
  constructor(private readonly userRepository: IUserRepository) {}

  async registerUser(input: AuthInput): Promise<UserModel> {
    const email = input.email.trim().toLowerCase();
    if (!email) {
      throw new ValidationError('Email is required');
    }
    if (!input.password || input.password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters');
    }

    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new ConflictError('Email already exists');
    }

    const passwordHash = await hashPassword(input.password);
    return this.userRepository.create({ email, passwordHash });
  }

  async loginUser(input: AuthInput): Promise<LoginResult> {
    const email = input.email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(email);

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
}
