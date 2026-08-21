import type { AuthUser } from '../api/types';

/** Only Cashier and Cashier Supervisor spend their day at the register — every other role has no business on the POS screen at all. */
export const POS_ROLES = ['Cashier', 'Cashier Supervisor'];

export function canAccessPos(user: Pick<AuthUser, 'role_name'> | null): boolean {
  return user !== null && user.role_name !== null && POS_ROLES.includes(user.role_name);
}
