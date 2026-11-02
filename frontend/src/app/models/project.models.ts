// Shapes returned by the .NET API (backend/Sandugorea.Api/Contracts/Dtos.cs).

export interface ProjectPhoto {
  id: string;
  name: string;
  /** Bytes. */
  size: number;
  width: number;
  height: number;
  uploadedAt: string;
  thumbUrl: string;
  previewUrl: string;
  originalUrl: string;
}

/** A private folder of photos for one customer, with its own username + password. */
export interface ProjectSummary {
  id: string;
  title: string;
  /** Session date (yyyy-mm-dd). */
  date: string;
  customerName: string;
  customerEmail: string;
  language: string;
  username: string;
  active: boolean;
  createdAt: string;
  sentAt: string | null;
  lastLoginAt: string | null;
  photoCount: number;
  totalBytes: number;
  coverUrls: string[];
}

export interface ProjectDetail extends Omit<ProjectSummary, 'photoCount' | 'coverUrls'> {
  photos: ProjectPhoto[];
}

export interface CustomerProject {
  title: string;
  date: string;
  customerName: string;
  totalBytes: number;
  photos: ProjectPhoto[];
}

export interface Stats {
  projects: number;
  drafts: number;
  delivered: number;
  photos: number;
  bytes: number;
}

export interface NewProject {
  title: string;
  date: string;
  customerName: string;
  customerEmail: string;
  language: string;
  username: string;
  password: string;
}

export interface AdminSessionInfo {
  id: string;
  device: string | null;
  ip: string | null;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

export interface LoginEventInfo {
  at: string;
  ip: string | null;
  device: string | null;
  success: boolean;
  detail: string | null;
}

export type ProjectStatus = 'draft' | 'delivered' | 'disabled';

export function projectStatus(p: { active: boolean; sentAt: string | null }): ProjectStatus {
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
  displayName: string;
}
