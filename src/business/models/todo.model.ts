export interface TodoModel {
  id: number;
  userId: number;
  message: string;
  check: boolean;
  createdAt: Date;
  updatedAt: Date;
}
