export type Role = 'Doctor' | 'Nurse' | 'Records Desk' | 'ASHA' | 'Admin';

export const ROLES: Role[] = ['Doctor', 'Nurse', 'Records Desk', 'ASHA', 'Admin'];

/** The staff member signed in for each role (synthetic names). Recorded as the actor in the audit log. */
export const STAFF_BY_ROLE: Record<Role, { name: string; title: string }> = {
  Doctor: { name: 'Dr. Meera Kapoor', title: 'Medical Officer, OPD' },
  Nurse: { name: 'Sr. Asha Thomas', title: 'Staff Nurse' },
  'Records Desk': { name: 'Ravi Shukla', title: 'Records Clerk' },
  ASHA: { name: 'Kamla Devi', title: 'ASHA Worker' },
  Admin: { name: 'Neha Joshi', title: 'Hospital Administrator' },
};

export const NAV_BY_ROLE: Record<Role, { label: string; to: string; icon: string }[]> = {
  Doctor: [
    { label: 'Today', to: '/doctor', icon: 'pen' },
    { label: 'Queue', to: '/queue', icon: 'inbox' },
  ],
  Nurse: [
    { label: 'Validation', to: '/nurse', icon: 'checkSquare' },
    { label: 'Records', to: '/records', icon: 'folder' },
  ],
  'Records Desk': [
    { label: 'Defaulters', to: '/records', icon: 'phone' },
    { label: 'ASHA', to: '/asha', icon: 'mapPin' },
  ],
  ASHA: [
    { label: 'Unreachable', to: '/asha', icon: 'mapPin' },
  ],
  Admin: [
    { label: 'Audit', to: '/audit', icon: 'fileText' },
    { label: 'Admin', to: '/admin', icon: 'barChart' },
    { label: 'Config', to: '/config', icon: 'settings' },
  ],
};

/** First role whose nav contains this path, so a direct link lands in the right shell. */
export function roleForPath(path: string): Role | null {
  return ROLES.find((r) => NAV_BY_ROLE[r].some((item) => item.to === path)) ?? null;
}
