import type { TodoModel } from '../models/todo.model.js';

export interface FindTodosQuery {
  userId: number;
  page: number;
  limit: number;
  search?: string;
  check?: boolean;
}

export interface ITodoRepository {
  findPaginated(query: FindTodosQuery): Promise<{ rows: TodoModel[]; count: number }>;
  findById(userId: number, id: number): Promise<TodoModel | null>;
  findByIds(userId: number, ids: number[]): Promise<TodoModel[]>;
  bulkCreate(userId: number, items: Array<{ message: string; check: boolean }>): Promise<TodoModel[]>;
  updateRecord(
    userId: number,
    id: number,
    patch: Partial<Pick<TodoModel, 'message' | 'check'>>,
  ): Promise<TodoModel | null>;
  deleteById(userId: number, id: number): Promise<number>;
  deleteByIds(userId: number, ids: number[]): Promise<number>;
}
