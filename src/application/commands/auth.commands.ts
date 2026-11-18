import { ConflictError, UnauthorizedError } from '../errors.js';
import type { User } from '../models.js';
import type { PasswordHasher, TokenService, Transactor, UserRepository } from '../ports.js';
import { getCurrentTx, Transactional } from '../transactional.js';
import { AuthLoginSchema, AuthRegisterSchema, parseOrThrow } from '../validation.js';

export interface AuthInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: User;
}

export class AuthCommands {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    public readonly transactor: Transactor,
  ) {}

  @Transactional()
  async register(input: AuthInput): Promise<User> {
    const { email, password } = parseOrThrow(AuthRegisterSchema, input);

    const tx = getCurrentTx();
    const existing = await this.users.findByEmail(email, tx);
    if (existing) {
      throw new ConflictError('Email already exists');
    }

    const passwordHash = await this.passwordHasher.hash(password);
    return this.users.create({ email, passwordHash }, tx);
  }

  async login(input: AuthInput): Promise<LoginResult> {
    const { email, password } = parseOrThrow(AuthLoginSchema, input);
    const user = await this.users.findByEmail(email);

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await this.passwordHasher.verify(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = await this.tokenService.sign({
      sub: user.id,
      email: user.email,
    });

    return { token, user };
  }
}
