import { todolistRepository } from '../data/repositories/todolist.repository.js';
import { todoRepository } from '../data/repositories/todo.repository.js';
import { userRepository } from '../data/repositories/user.repository.js';
import {
  AuthService,
  type AuthInput,
  type LoginResult,
} from './services/auth.service.js';
import {
  TodolistService,
  type CreateTodolistInput,
  type ListTodolistsInput,
  type UpdateTodolistInput,
} from './services/todolist.service.js';
import {
  TodoService,
  type CreateTodoInput,
  type ListTodosInput,
  type UpdateTodoInput,
} from './services/todo.service.js';

export * from './models/user.model.js';
export * from './models/todolist.model.js';
export * from './models/todo.model.js';
export * from './repositories/IUserRepository.js';
export * from './repositories/ITodolistRepository.js';
export * from './repositories/ITodoRepository.js';
export * from './services/auth.service.js';
export * from './services/todolist.service.js';
export * from './services/todo.service.js';

export const authService = new AuthService(userRepository);
export const todolistService = new TodolistService(todolistRepository);
export const todoService = new TodoService(todoRepository);

export const registerUser = (input: AuthInput) => authService.registerUser(input);
export const loginUser = (input: AuthInput) => authService.loginUser(input);

export const listTodolists = (input: ListTodolistsInput) =>
  todolistService.listTodolists(input);
export const getTodolistById = (userId: number, id: number) =>
  todolistService.getTodolistById(userId, id);
export const createTodolists = (userId: number, items: CreateTodolistInput[]) =>
  todolistService.createTodolists(userId, items);
export const updateTodolists = (userId: number, items: UpdateTodolistInput[]) =>
  todolistService.updateTodolists(userId, items);
export const deleteTodolistById = (userId: number, id: number) =>
  todolistService.deleteTodolistById(userId, id);
export const deleteTodolists = (userId: number, ids: number[]) =>
  todolistService.deleteTodolists(userId, ids);

export const listTodos = (input: ListTodosInput) => todoService.listTodos(input);
export const getTodoById = (userId: number, id: number) =>
  todoService.getTodoById(userId, id);
export const createTodos = (userId: number, items: CreateTodoInput[]) =>
  todoService.createTodos(userId, items);
export const updateTodos = (userId: number, items: UpdateTodoInput[]) =>
  todoService.updateTodos(userId, items);
export const deleteTodoById = (userId: number, id: number) =>
  todoService.deleteTodoById(userId, id);
export const deleteTodos = (userId: number, ids: number[]) =>
  todoService.deleteTodos(userId, ids);
