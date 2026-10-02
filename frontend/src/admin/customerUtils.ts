import type { CustomerDirectoryRow } from '../api/types';

export type Activity = { label: string; css: string };

/** Where a customer stands: inactive record, never bought, lapsed, new this month, or a regular. */
export function customerActivity(c: CustomerDirectoryRow, lapsedDays: number): Activity {
  if (Number(c.is_active) !== 1) return { label: 'Inactive', css: 'var(--mui-palette-text-secondary)' };
  const created = new Date(c.created_at.replace(' ', 'T'));
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  if (!c.last_visit) {
    return created >= monthStart ? { label: 'New', css: 'var(--mui-palette-primary-main)' } : { label: 'Never bought', css: 'var(--mui-palette-text-secondary)' };
  }
  const last = new Date(c.last_visit.replace(' ', 'T'));
  if (Date.now() - last.getTime() > lapsedDays * 86_400_000) return { label: 'Lapsed', css: 'var(--mui-palette-warning-main)' };
  if (created >= monthStart) return { label: 'New', css: 'var(--mui-palette-primary-main)' };
  return { label: 'Active', css: 'var(--mui-palette-success-main)' };
}
