import {
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from 'sequelize';

export class UserEntity extends Model<
  InferAttributes<UserEntity>,
  InferCreationAttributes<UserEntity>
> {
  declare id: CreationOptional<number>;
  declare email: string;
  declare passwordHash: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
