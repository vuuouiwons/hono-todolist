import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  DataTypes,
  Sequelize,
  type Model,
  type ModelDefined,
  type Optional,
  type Transaction,
} from 'sequelize';
import type { Todo, Todolist, User } from '../application/models.js';
import type { Transactor, Tx } from '../application/ports.js';
import { getCurrentTx } from '../application/transactional.js';

type UserAttrs = Omit<User, 'createdAt'> & { createdAt: Date; updatedAt: Date };
type UserCreationAttrs = Optional<UserAttrs, 'id' | 'createdAt' | 'updatedAt'>;
export type UserRecord = Model<UserAttrs, UserCreationAttrs>;
export type UserTable = ModelDefined<UserAttrs, UserCreationAttrs>;

type TodolistAttrs = Omit<Todolist, 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
};
type TodolistCreationAttrs = Optional<TodolistAttrs, 'id' | 'createdAt' | 'updatedAt'>;
export type TodolistRecord = Model<TodolistAttrs, TodolistCreationAttrs>;
export type TodolistTable = ModelDefined<TodolistAttrs, TodolistCreationAttrs>;

type TodoAttrs = Omit<Todo, 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
};
type TodoCreationAttrs = Optional<TodoAttrs, 'id' | 'check' | 'createdAt' | 'updatedAt'>;
export type TodoRecord = Model<TodoAttrs, TodoCreationAttrs>;
export type TodoTable = ModelDefined<TodoAttrs, TodoCreationAttrs>;

export interface DatabaseContext {
  sequelize: Sequelize;
  tables: {
    User: UserTable;
    Todolist: TodolistTable;
    Todo: TodoTable;
  };
  transactor: Transactor;
  close(): Promise<void>;
}

export interface DatabaseOptions {
  storage?: string;
  logging?: boolean;
}

export function unwrapTx(tx?: Tx): Transaction | undefined {
  return (tx ?? getCurrentTx()) as unknown as Transaction | undefined;
}

export class SequelizeTransactor implements Transactor {
  constructor(private readonly sequelize: Sequelize) {}

  async execInTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.sequelize.transaction((transaction) => fn(transaction as unknown as Tx));
  }
}

export async function initializeDatabase(options: DatabaseOptions = {}): Promise<DatabaseContext> {
  const storage = options.storage ?? ':memory:';

  if (storage !== ':memory:') {
    mkdirSync(dirname(storage), { recursive: true });
  }

  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: options.logging ? console.log : false,
  });

  const User = sequelize.define<UserRecord>(
    'User',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
    },
    { tableName: 'users', timestamps: true, underscored: true },
  );

  const Todolist = sequelize.define<TodolistRecord>(
    'Todolist',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
      title: { type: DataTypes.STRING(255), allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
    },
    { tableName: 'todolists', timestamps: true, underscored: true, indexes: [{ fields: ['user_id'] }] },
  );

  const Todo = sequelize.define<TodoRecord>(
    'Todo',
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
      message: { type: DataTypes.TEXT, allowNull: false },
      check: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
    },
    { tableName: 'todos', timestamps: true, underscored: true, indexes: [{ fields: ['user_id'] }] },
  );

  User.hasMany(Todolist, { foreignKey: 'userId', as: 'todolists', onDelete: 'CASCADE' });
  Todolist.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  User.hasMany(Todo, { foreignKey: 'userId', as: 'todos', onDelete: 'CASCADE' });
  Todo.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  await sequelize.authenticate();
  await sequelize.sync();

  return {
    sequelize,
    tables: { User, Todolist, Todo },
    transactor: new SequelizeTransactor(sequelize),
    async close(): Promise<void> {
      await sequelize.close();
    },
  };
}
