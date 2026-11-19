import type { TodolistModel } from '../../business/models/todolist.model.js';

export function shapeTodolist(item: TodolistModel) {
  return {
    id: item.id,
    userId: item.userId,
    title: item.title,
    createdAt: new Date(item.createdAt).toISOString(),
    updatedAt: new Date(item.updatedAt).toISOString(),
  };
}
