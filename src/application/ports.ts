import type {
  CreateTodoInput,
  CreateTodolistInput,
  Todo,
  Todolist,
  UpdateTodoInput,
  UpdateTodolistInput,
  User,
} from './models.js';

export interface Tx {
  readonly _brand?: unique symbol;
}

export interface Transactor {
  execInTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T>;
}

export interface UserRepository {
  findByEmail(email: string, tx?: Tx): Promise<User | null>;
  findById(id: number, tx?: Tx): Promise<User | null>;
  create(input: { email: string; passwordHash: string }, tx?: Tx): Promise<User>;
}

export interface FindTodolistsParams {
  userId: number;
  page: number;
  limit: number;
  search?: string;
}

export interface TodolistRepository {
  findAll(params: FindTodolistsParams, tx?: Tx): Promise<{ items: Todolist[]; totalItems: number }>;
  findById(userId: number, id: number, tx?: Tx): Promise<Todolist | null>;
  createMany(userId: number, items: CreateTodolistInput[], tx?: Tx): Promise<Todolist[]>;
  updateMany(userId: number, items: UpdateTodolistInput[], tx?: Tx): Promise<Todolist[]>;
  deleteMany(userId: number, ids: number[], tx?: Tx): Promise<number>;
}

export interface FindTodosParams {
  userId: number;
  page: number;
  limit: number;
  search?: string;
  check?: boolean;
}

export interface TodoRepository {
  findAll(params: FindTodosParams, tx?: Tx): Promise<{ items: Todo[]; totalItems: number }>;
  findById(userId: number, id: number, tx?: Tx): Promise<Todo | null>;
  createMany(userId: number, items: CreateTodoInput[], tx?: Tx): Promise<Todo[]>;
  updateMany(userId: number, items: UpdateTodoInput[], tx?: Tx): Promise<Todo[]>;
  deleteMany(userId: number, ids: number[], tx?: Tx): Promise<number>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
}

export interface TokenPayload {
  sub: number;
  email: string;
}

export interface TokenService {
  sign(payload: TokenPayload): Promise<string>;
  verify(token: string): Promise<TokenPayload>;
}
