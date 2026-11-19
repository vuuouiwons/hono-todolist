import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  DataTypes,
  Model,
  Sequelize,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
  type Transaction,
} from 'sequelize';

const clsStorage = new AsyncLocalStorage<Map<string, unknown>>();

// Wire Sequelize's built-in CLS hook to Node's AsyncLocalStorage so any active
// transaction is propagated automatically to all ORM calls in the async chain.
Sequelize.useCLS({
  run<T>(fn: (context: Map<string, unknown>) => T): T {
    const store = new Map(clsStorage.getStore());
    return clsStorage.run(store, () => fn(store));
  },
  get(key: string): unknown {
    return clsStorage.getStore()?.get(key);
  },
  set(key: string, value: unknown): unknown {
    clsStorage.getStore()?.set(key, value);
    return value;
  },
  bind<T extends (...args: unknown[]) => unknown>(fn: T): T {
    const store = clsStorage.getStore();
    if (!store) {
      return fn;
    }
    return ((...args: unknown[]) => clsStorage.run(store, () => fn(...args))) as T;
  },
} as never);

export class UserModel extends Model<
  InferAttributes<UserModel>,
  InferCreationAttributes<UserModel>
> {
  declare id: CreationOptional<number>;
  declare email: string;
  declare passwordHash: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TodolistModel extends Model<
  InferAttributes<TodolistModel>,
  InferCreationAttributes<TodolistModel>
> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<UserModel['id']>;
  declare title: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export class TodoModel extends Model<
  InferAttributes<TodoModel>,
  InferCreationAttributes<TodoModel>
> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<UserModel['id']>;
  declare message: string;
  declare check: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export type UserAttributes = InferAttributes<UserModel>;
export type TodolistAttributes = InferAttributes<TodolistModel>;
export type TodoAttributes = InferAttributes<TodoModel>;

export interface DbOptions {
  storage?: string;
  logging?: boolean;
}

let activeSequelize: Sequelize | null = null;

export function getSequelize(): Sequelize {
  if (!activeSequelize) {
    throw new Error('Database not initialized. Call initDb() before accessing models.');
  }
  return activeSequelize;
}

export function getCurrentTransaction(): Transaction | undefined {
  return clsStorage.getStore()?.get('transaction') as Transaction | undefined;
}

export async function withTransaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const existing = getCurrentTransaction();
  if (existing) {
    return fn(existing);
  }
  return getSequelize().transaction(fn);
}

export async function initDb(options: DbOptions = {}): Promise<Sequelize> {
  if (activeSequelize) {
    await activeSequelize.close();
    activeSequelize = null;
  }

  const storage = options.storage ?? process.env.DB_STORAGE ?? './data/todo.sqlite';
  if (storage !== ':memory:') {
    mkdirSync(dirname(storage), { recursive: true });
  }

  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: options.logging ? console.log : false,
  });

  UserModel.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
    },
    { sequelize, modelName: 'User', tableName: 'users', timestamps: true, underscored: true },
  );

  TodolistModel.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
      title: { type: DataTypes.STRING(255), allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
    },
    {
      sequelize,
      modelName: 'Todolist',
      tableName: 'todolists',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['user_id'] }],
    },
  );

  TodoModel.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
      message: { type: DataTypes.TEXT, allowNull: false },
      check: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
    },
    {
      sequelize,
      modelName: 'Todo',
      tableName: 'todos',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['user_id'] }],
    },
  );

  UserModel.hasMany(TodolistModel, { foreignKey: 'userId', as: 'todolists', onDelete: 'CASCADE' });
  TodolistModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });

  UserModel.hasMany(TodoModel, { foreignKey: 'userId', as: 'todos', onDelete: 'CASCADE' });
  TodoModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });

  await sequelize.authenticate();
  await sequelize.sync();

  activeSequelize = sequelize;
  return sequelize;
}

export async function resetDb(): Promise<void> {
  await getSequelize().sync({ force: true });
}

export async function closeDb(): Promise<void> {
  if (activeSequelize) {
    await activeSequelize.close();
    activeSequelize = null;
  }
}
