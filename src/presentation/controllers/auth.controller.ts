import type { Context } from 'hono';
import { authService, type UserModel } from '../../business/index.js';
import type { AppEnv } from '../middlewares/middlewares.js';

export function shapeUser(user: UserModel) {
  return {
    id: user.id,
    email: user.email,
    createdAt: new Date(user.createdAt).toISOString(),
  };
}

export const authController = {
  async register(c: Context<AppEnv>) {
    const body = (c.req as unknown as { valid: (target: string) => { email: string; password: string } }).valid('json');
    const user = await authService.registerUser(body);
    return c.json(
      {
        message: 'User registered successfully',
        data: shapeUser(user),
      },
      201,
    );
  },

  async login(c: Context<AppEnv>) {
    const body = (c.req as unknown as { valid: (target: string) => { email: string; password: string } }).valid('json');
    const result = await authService.loginUser(body);
    return c.json(
      {
        message: 'Login successful',
        token: result.token,
        data: shapeUser(result.user),
      },
      200,
    );
  },
};
