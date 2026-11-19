import type { TodoModel } from '../../business/models/todo.model.js';

export function shapeTodo(item: TodoModel) {
  return {
    id: item.id,
    userId: item.userId,
    message: item.message,
    check: item.check,
    createdAt: new Date(item.createdAt).toISOString(),
    updatedAt: new Date(item.updatedAt).toISOString(),
  };
}
