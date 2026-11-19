import type { TodolistModel } from '../models/todolist.model.js';

export interface FindTodolistsQuery {
  userId: number;
  page: number;
  limit: number;
  search?: string;
}

export interface ITodolistRepository {
  findPaginated(query: FindTodolistsQuery): Promise<{ rows: TodolistModel[]; count: number }>;
  findById(userId: number, id: number): Promise<TodolistModel | null>;
  findByIds(userId: number, ids: number[]): Promise<TodolistModel[]>;
  bulkCreate(userId: number, items: Array<{ title: string }>): Promise<TodolistModel[]>;
  updateRecord(userId: number, id: number, patch: { title: string }): Promise<TodolistModel | null>;
  deleteById(userId: number, id: number): Promise<number>;
  deleteByIds(userId: number, ids: number[]): Promise<number>;
}
