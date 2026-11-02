export interface ClientAccount {
  id: string;
  name: string;
  email: string;
  username: string;
  createdAt: string;
  lastLoginAt?: string;
  active: boolean;
}

export interface GalleryPhoto {
  id: string;
  name: string;
  url: string;
  thumbUrl: string;
  /** Bytes. */
  size: number;
  uploadedAt: string;
}

/** A private folder of photos that belongs to exactly one client. */
export interface Gallery {
  id: string;
  clientId: string;
  title: string;
  /** Session date (ISO). */
  date: string;
  photos: GalleryPhoto[];
  /** When the client was notified. Unsent galleries are invisible to the client. */
  sentAt?: string;
}

export type Role = 'admin' | 'client';

export interface Session {
  role: Role;
  username: string;
  displayName: string;
  clientId?: string;
}
