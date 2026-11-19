import { Op, type WhereOptions } from 'sequelize';
import type { TodoModel } from '../../business/models/todo.model.js';
import type {
  FindTodosQuery,
  ITodoRepository,
} from '../../business/repositories/ITodoRepository.js';
import { TodoEntity } from '../entities/todo.entity.js';
import { toTodoDomain } from '../mappers/todo.mapper.js';

export class TodoRepository implements ITodoRepository {
  async findPaginated(
    query: FindTodosQuery,
  ): Promise<{ rows: TodoModel[]; count: number }> {
    const where: WhereOptions<TodoEntity> = { userId: query.userId };
    if (query.search) {
      where.message = { [Op.like]: `%${query.search}%` };
    }
    if (query.check !== undefined) {
      where.check = query.check;
    }

    const { rows, count } = await TodoEntity.findAndCountAll({
      where,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      order: [['id', 'ASC']],
    });

    return {
      rows: rows.map(toTodoDomain),
      count,
    };
  }

  async findById(userId: number, id: number): Promise<TodoModel | null> {
    const record = await TodoEntity.findOne({ where: { id, userId } });
    return record ? toTodoDomain(record) : null;
  }

  async findByIds(userId: number, ids: number[]): Promise<TodoModel[]> {
    if (ids.length === 0) {
      return [];
    }
    const records = await TodoEntity.findAll({
      where: { userId, id: { [Op.in]: ids } },
    });
    return records.map(toTodoDomain);
  }

  async bulkCreate(
    userId: number,
    items: Array<{ message: string; check: boolean }>,
  ): Promise<TodoModel[]> {
    const created = await TodoEntity.bulkCreate(
      items.map((item) => ({ userId, message: item.message, check: item.check })),
      { returning: true },
    );
    return created.map(toTodoDomain);
  }

  async updateRecord(
    userId: number,
    id: number,
    patch: Partial<Pick<TodoModel, 'message' | 'check'>>,
  ): Promise<TodoModel | null> {
    const record = await TodoEntity.findOne({ where: { id, userId } });
    if (!record) {
      return null;
    }
    await record.update(patch);
    return toTodoDomain(record);
  }

  async deleteById(userId: number, id: number): Promise<number> {
    return TodoEntity.destroy({ where: { userId, id } });
  }

  async deleteByIds(userId: number, ids: number[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }
    return TodoEntity.destroy({
      where: { userId, id: { [Op.in]: ids } },
    });
  }
}

export const todoRepository = new TodoRepository();
