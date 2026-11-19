import {
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import type { UserEntity } from './user.entity.js';

export class TodolistEntity extends Model<
  InferAttributes<TodolistEntity>,
  InferCreationAttributes<TodolistEntity>
> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<UserEntity['id']>;
  declare title: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
