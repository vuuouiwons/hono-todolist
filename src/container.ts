import { AuthCommands } from './application/commands/auth.commands.js';
import { TodoCommands } from './application/commands/todo.commands.js';
import { TodolistCommands } from './application/commands/todolist.commands.js';
import type { Transactor } from './application/ports.js';
import { TodoQueries } from './application/queries/todo.queries.js';
import { TodolistQueries } from './application/queries/todolist.queries.js';
import { initializeDatabase } from './infrastructure/database.js';
import {
  SequelizeTodoRepository,
  SequelizeTodolistRepository,
  SequelizeUserRepository,
} from './infrastructure/repositories.js';
import { HonoJwtTokenService, ScryptPasswordHasher } from './infrastructure/security.js';

export interface ContainerConfig {
  dbStorage?: string;
  dbLogging?: boolean;
  jwtSecret?: string;
  jwtTtlSeconds?: number;
}

export interface AppContainer {
  transactor: Transactor;
  commands: {
    auth: AuthCommands;
    todolist: TodolistCommands;
    todo: TodoCommands;
  };
  queries: {
    todolist: TodolistQueries;
    todo: TodoQueries;
  };
  close(): Promise<void>;
}

export async function createContainer(config: ContainerConfig = {}): Promise<AppContainer> {
  const database = await initializeDatabase({
    storage: config.dbStorage ?? process.env.DB_STORAGE ?? './data/todo.sqlite',
    logging: config.dbLogging ?? false,
  });

  const userRepository = new SequelizeUserRepository(database.tables.User);
  const todolistRepository = new SequelizeTodolistRepository(database.tables.Todolist);
  const todoRepository = new SequelizeTodoRepository(database.tables.Todo);

  const passwordHasher = new ScryptPasswordHasher();
  const jwtSecret =
    config.jwtSecret ?? process.env.JWT_SECRET ?? 'hono-layered-arch-dev-secret-change-in-prod';
  const tokenService = new HonoJwtTokenService(jwtSecret, config.jwtTtlSeconds);

  return {
    transactor: database.transactor,
    commands: {
      auth: new AuthCommands(userRepository, passwordHasher, tokenService),
      todolist: new TodolistCommands(todolistRepository),
      todo: new TodoCommands(todoRepository),
    },
    queries: {
      todolist: new TodolistQueries(todolistRepository),
      todo: new TodoQueries(todoRepository),
    },
    async close(): Promise<void> {
      await database.close();
    },
  };
}
