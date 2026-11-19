import { UniqueConstraintError } from 'sequelize';
import type { UserModel } from '../../business/models/user.model.js';
import type { IUserRepository } from '../../business/repositories/IUserRepository.js';
import { ConflictError } from '../../shared/errors.js';
import { UserEntity } from '../entities/user.entity.js';
import { toUserDomain } from '../mappers/user.mapper.js';

export class UserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<UserModel | null> {
    const record = await UserEntity.findOne({ where: { email } });
    return record ? toUserDomain(record) : null;
  }

  async findById(id: number): Promise<UserModel | null> {
    const record = await UserEntity.findByPk(id);
    return record ? toUserDomain(record) : null;
  }

  async create(data: { email: string; passwordHash: string }): Promise<UserModel> {
    try {
      const created = await UserEntity.create(data);
      return toUserDomain(created);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictError('Email already exists');
      }
      throw error;
    }
  }
}

export const userRepository = new UserRepository();
