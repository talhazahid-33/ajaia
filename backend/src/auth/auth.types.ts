export const USER_ID_HEADER = 'x-user-id';

export type RequestUser = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};
