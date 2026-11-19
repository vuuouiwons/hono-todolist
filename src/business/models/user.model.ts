export interface UserModel {
  id: number;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
