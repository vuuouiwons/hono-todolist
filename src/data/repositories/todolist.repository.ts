import { Op, type WhereOptions } from 'sequelize';
import type { TodolistModel } from '../../business/models/todolist.model.js';
import type {
  FindTodolistsQuery,
  ITodolistRepository,
} from '../../business/repositories/ITodolistRepository.js';
import { TodolistEntity } from '../entities/todolist.entity.js';
import { toTodolistDomain } from '../mappers/todolist.mapper.js';

export class TodolistRepository implements ITodolistRepository {
  async findPaginated(
    query: FindTodolistsQuery,
  ): Promise<{ rows: TodolistModel[]; count: number }> {
    const where: WhereOptions<TodolistEntity> = { userId: query.userId };
    if (query.search) {
      where.title = { [Op.like]: `%${query.search}%` };
    }

    const { rows, count } = await TodolistEntity.findAndCountAll({
      where,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      order: [['id', 'ASC']],
    });

    return {
      rows: rows.map(toTodolistDomain),
      count,
    };
  }

  async findById(userId: number, id: number): Promise<TodolistModel | null> {
    const record = await TodolistEntity.findOne({ where: { id, userId } });
    return record ? toTodolistDomain(record) : null;
  }

  async findByIds(userId: number, ids: number[]): Promise<TodolistModel[]> {
    if (ids.length === 0) {
      return [];
    }
    const records = await TodolistEntity.findAll({
      where: { userId, id: { [Op.in]: ids } },
    });
    return records.map(toTodolistDomain);
  }

  async bulkCreate(
    userId: number,
    items: Array<{ title: string }>,
  ): Promise<TodolistModel[]> {
    const created = await TodolistEntity.bulkCreate(
      items.map((item) => ({ userId, title: item.title })),
      { returning: true },
    );
    return created.map(toTodolistDomain);
  }

  async updateRecord(
    userId: number,
    id: number,
    patch: { title: string },
  ): Promise<TodolistModel | null> {
    const record = await TodolistEntity.findOne({ where: { id, userId } });
    if (!record) {
      return null;
    }
    await record.update(patch);
    return toTodolistDomain(record);
  }

  async deleteById(userId: number, id: number): Promise<number> {
    return TodolistEntity.destroy({ where: { userId, id } });
  }

  async deleteByIds(userId: number, ids: number[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }
    return TodolistEntity.destroy({
      where: { userId, id: { [Op.in]: ids } },
    });
  }
}

export const todolistRepository = new TodolistRepository();
