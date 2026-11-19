import { Op, type WhereOptions } from 'sequelize';
import { TodolistModel, type TodolistAttributes } from '../index.js';

export interface FindTodolistsQuery {
  userId: number;
  page: number;
  limit: number;
  search?: string;
}

export const todolistRepository = {
  async findPaginated(
    query: FindTodolistsQuery,
  ): Promise<{ rows: TodolistAttributes[]; count: number }> {
    const where: WhereOptions<TodolistAttributes> = { userId: query.userId };
    if (query.search) {
      where.title = { [Op.like]: `%${query.search}%` };
    }

    const { rows, count } = await TodolistModel.findAndCountAll({
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

  async findById(userId: number, id: number): Promise<TodolistAttributes | null> {
    const record = await TodolistModel.findOne({ where: { id, userId } });
    return record ? record.get({ plain: true }) : null;
  },

  async findByIds(userId: number, ids: number[]): Promise<TodolistModel[]> {
    if (ids.length === 0) {
      return [];
    }
    return TodolistModel.findAll({
      where: { userId, id: { [Op.in]: ids } },
    });
  },

  async bulkCreate(
    userId: number,
    items: Array<{ title: string }>,
  ): Promise<TodolistAttributes[]> {
    const created = await TodolistModel.bulkCreate(
      items.map((item) => ({ userId, title: item.title })),
      { returning: true },
    );
    return created.map((row) => row.get({ plain: true }));
  },

  async updateRecord(
    record: TodolistModel,
    patch: { title: string },
  ): Promise<TodolistAttributes> {
    await record.update(patch);
    return record.get({ plain: true });
  },

  async deleteById(userId: number, id: number): Promise<number> {
    return TodolistModel.destroy({ where: { userId, id } });
  },

  async deleteByIds(userId: number, ids: number[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }
    return TodolistModel.destroy({
      where: { userId, id: { [Op.in]: ids } },
    });
  },
};
