import {
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';
import type { UserEntity } from './user.entity.js';

export class TodoEntity extends Model<
  InferAttributes<TodoEntity>,
  InferCreationAttributes<TodoEntity>
> {
  declare id: CreationOptional<number>;
  declare userId: ForeignKey<UserEntity['id']>;
  declare message: string;
  declare check: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
