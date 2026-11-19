import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DataTypes, Sequelize, type Transaction } from 'sequelize';
import { TodoEntity } from './entities/todo.entity.js';
import { TodolistEntity } from './entities/todolist.entity.js';
import { UserEntity } from './entities/user.entity.js';

const clsStorage = new AsyncLocalStorage<Map<string, unknown>>();

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

  UserEntity.init(
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
      createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at' },
      updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at' },
    },
    { sequelize, modelName: 'User', tableName: 'users', timestamps: true, underscored: true },
  );

  TodolistEntity.init(
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

  TodoEntity.init(
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

  UserEntity.hasMany(TodolistEntity, {
    foreignKey: 'userId',
    as: 'todolists',
    onDelete: 'CASCADE',
  });
  TodolistEntity.belongsTo(UserEntity, {
    foreignKey: 'userId',
    as: 'user',
  });

  UserEntity.hasMany(TodoEntity, {
    foreignKey: 'userId',
    as: 'todos',
    onDelete: 'CASCADE',
  });
  TodoEntity.belongsTo(UserEntity, {
    foreignKey: 'userId',
    as: 'user',
  });

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
