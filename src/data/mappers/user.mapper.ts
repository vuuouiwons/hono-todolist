import type { UserModel } from '../../business/models/user.model.js';
import type { UserEntity } from '../entities/user.entity.js';

export function toUserDomain(entity: UserEntity): UserModel {
  const plain = entity.get({ plain: true });
  return {
    id: plain.id,
    email: plain.email,
    passwordHash: plain.passwordHash,
    createdAt: new Date(plain.createdAt),
    updatedAt: new Date(plain.updatedAt),
  };
}
