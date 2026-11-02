export interface ProjectPhoto {
  id: string;
  name: string;
  url: string;
  thumbUrl: string;
  /** Bytes. */
  size: number;
  uploadedAt: string;
}

/**
 * A private folder of photos created by the photographer for one customer.
 * Each project has its own username + password; only that customer can open it.
 */
export interface Project {
  id: string;
  title: string;
  /** Session date (ISO yyyy-mm-dd). */
  date: string;
  customerName: string;
  customerEmail: string;
  username: string;
  createdAt: string;
  /** Access can be switched off without deleting anything. */
  active: boolean;
  /** When it was sent to the customer. Customers can't sign in before that. */
  sentAt?: string;
  lastLoginAt?: string;
  photos: ProjectPhoto[];
}

export type ProjectStatus = 'draft' | 'delivered' | 'disabled';

export function projectStatus(p: Project): ProjectStatus {
  if (!p.active) return 'disabled';
  return p.sentAt ? 'delivered' : 'draft';
}

/** Badge modifier per status (`.badge--success` etc.). */
export const STATUS_BADGE: Record<ProjectStatus, string> = {
  delivered: 'success',
  draft: 'accent',
  disabled: 'muted',
};

export type Role = 'admin' | 'customer';

export interface Session {
  role: Role;
  username: string;
  displayName: string;
  projectId?: string;
}
