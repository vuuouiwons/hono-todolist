import { Op, type WhereOptions } from 'sequelize';
import { TodoModel, type TodoAttributes } from '../index.js';

export interface FindTodosQuery {
  userId: number;
  page: number;
  limit: number;
  search?: string;
  check?: boolean;
}

export const todoRepository = {
  async findPaginated(query: FindTodosQuery): Promise<{ rows: TodoAttributes[]; count: number }> {
    const where: WhereOptions<TodoAttributes> = { userId: query.userId };
    if (query.search) {
      where.message = { [Op.like]: `%${query.search}%` };
    }
    if (query.check !== undefined) {
      where.check = query.check;
    }

    const { rows, count } = await TodoModel.findAndCountAll({
      where,
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      order: [['id', 'ASC']],
    });

    return {
      rows: rows.map((row) => row.get({ plain: true })),
      count,
    };
  },

  async findById(userId: number, id: number): Promise<TodoAttributes | null> {
    const record = await TodoModel.findOne({ where: { id, userId } });
    return record ? record.get({ plain: true }) : null;
  },

  async findByIds(userId: number, ids: number[]): Promise<TodoModel[]> {
    if (ids.length === 0) {
      return [];
    }
    return TodoModel.findAll({
      where: { userId, id: { [Op.in]: ids } },
    });
  },

  async bulkCreate(
    userId: number,
    items: Array<{ message: string; check: boolean }>,
  ): Promise<TodoAttributes[]> {
    const created = await TodoModel.bulkCreate(
      items.map((item) => ({ userId, message: item.message, check: item.check })),
      { returning: true },
    );
    return created.map((row) => row.get({ plain: true }));
  },

  async updateRecord(
    record: TodoModel,
    patch: Partial<Pick<TodoAttributes, 'message' | 'check'>>,
  ): Promise<TodoAttributes> {
    await record.update(patch);
    return record.get({ plain: true });
  },

  async deleteById(userId: number, id: number): Promise<number> {
    return TodoModel.destroy({ where: { userId, id } });
  },

  async deleteByIds(userId: number, ids: number[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }
    return TodoModel.destroy({
      where: { userId, id: { [Op.in]: ids } },
    });
  },
};
