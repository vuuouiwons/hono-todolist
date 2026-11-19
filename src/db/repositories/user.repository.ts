import { UniqueConstraintError } from 'sequelize';
import { ConflictError } from '../../utils/errors.js';
import { UserModel, type UserAttributes } from '../index.js';

export const userRepository = {
  async findByEmail(email: string): Promise<UserAttributes | null> {
    const record = await UserModel.findOne({ where: { email } });
    return record ? record.get({ plain: true }) : null;
  },

  async findById(id: number): Promise<UserAttributes | null> {
    const record = await UserModel.findByPk(id);
    return record ? record.get({ plain: true }) : null;
  },

  async create(data: { email: string; passwordHash: string }): Promise<UserAttributes> {
    try {
      const created = await UserModel.create(data);
      return created.get({ plain: true });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictError('Email already exists');
      }
      throw error;
    }
  },
};
