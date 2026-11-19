import type { TodolistModel } from '../../business/models/todolist.model.js';
import type { TodolistEntity } from '../entities/todolist.entity.js';

export function toTodolistDomain(entity: TodolistEntity): TodolistModel {
  const plain = entity.get({ plain: true });
  return {
    id: plain.id,
    userId: plain.userId,
    title: plain.title,
    createdAt: new Date(plain.createdAt),
    updatedAt: new Date(plain.updatedAt),
  };
}
