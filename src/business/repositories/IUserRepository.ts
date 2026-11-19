import type { UserModel } from '../models/user.model.js';

export interface IUserRepository {
  findByEmail(email: string): Promise<UserModel | null>;
  findById(id: number): Promise<UserModel | null>;
  create(data: { email: string; passwordHash: string }): Promise<UserModel>;
}
