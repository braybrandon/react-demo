export const UserStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  ARCHIVED: "archived",
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export default UserStatus;
