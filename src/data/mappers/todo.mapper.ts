import type { TodoModel } from '../../business/models/todo.model.js';
import type { TodoEntity } from '../entities/todo.entity.js';

export function toTodoDomain(entity: TodoEntity): TodoModel {
  const plain = entity.get({ plain: true });
  return {
    id: plain.id,
    userId: plain.userId,
    message: plain.message,
    check: plain.check,
    createdAt: new Date(plain.createdAt),
    updatedAt: new Date(plain.updatedAt),
  };
}
