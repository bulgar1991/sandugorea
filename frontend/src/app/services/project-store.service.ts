import { Injectable, computed, signal } from '@angular/core';
import { Project, ProjectPhoto } from '@models/project.models';
import { imageUrl } from '@/data/portfolio.data';
import { uid } from '@/utils/format';

export interface NewProject {
  title: string;
  date: string;
  customerName: string;
  customerEmail: string;
  username: string;
  password: string;
}

/**
 * In-memory MOCK of the projects API so the UI can be built first. Lookups read signals,
 * so calling them in a template or computed() stays reactive.
 * Nothing here is secure: the .NET backend will hash passwords and authorise every request.
 */
@Injectable({ providedIn: 'root' })
export class ProjectStore {
  private readonly _projects = signal<Project[]>(SEED);
  /** MOCK ONLY - the server stores salted hashes and never returns passwords. */
  private readonly passwords = new Map<string, string>([
    ['ana.mihai', 'demo1234'],
    ['elena.portraits', 'demo1234'],
    ['popescu.summer', 'demo1234'],
    ['ana.engagement', 'demo1234'],
  ]);

  readonly projects = this._projects.asReadonly();

  readonly stats = computed(() => {
    const projects = this._projects();
    const photos = projects.flatMap((p) => p.photos);
    return {
      projects: projects.length,
      delivered: projects.filter((p) => p.sentAt && p.active).length,
      drafts: projects.filter((p) => !p.sentAt).length,
      photos: photos.length,
      bytes: photos.reduce((sum, p) => sum + p.size, 0),
    };
  });

  project(id: string) {
    return this._projects().find((p) => p.id === id);
  }

  usernameTaken(username: string) {
    return this._projects().some((p) => p.username.toLowerCase() === username.toLowerCase());
  }

  create(data: NewProject): Project {
    const project: Project = {
      id: uid('p_'),
      title: data.title,
      date: data.date,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      username: data.username,
      createdAt: new Date().toISOString(),
      active: true,
      photos: [],
    };
    this.passwords.set(data.username, data.password);
    this._projects.update((list) => [project, ...list]);
    return project;
  }

  setActive(id: string, active: boolean) {
    this.patch(id, (p) => ({ ...p, active }));
  }

  resetPassword(id: string, password: string) {
    const p = this.project(id);
    if (p) this.passwords.set(p.username, password);
  }

  delete(id: string) {
    const p = this.project(id);
    if (p) this.passwords.delete(p.username);
    this._projects.update((list) => list.filter((x) => x.id !== id));
  }

  addPhoto(id: string, photo: Omit<ProjectPhoto, 'id' | 'uploadedAt'>) {
    const full: ProjectPhoto = { ...photo, id: uid('ph_'), uploadedAt: new Date().toISOString() };
    this.patch(id, (p) => ({ ...p, photos: [...p.photos, full] }));
  }

  deletePhoto(id: string, photoId: string) {
    this.patch(id, (p) => ({ ...p, photos: p.photos.filter((x) => x.id !== photoId) }));
  }

  send(id: string) {
    this.patch(id, (p) => ({ ...p, sentAt: new Date().toISOString() }));
  }

  /** MOCK ONLY - the server does this. Only active, delivered projects can be opened. */
  verifyCustomer(username: string, password: string): Project | undefined {
    const p = this._projects().find((x) => x.username === username);
    if (!p || !p.active || !p.sentAt || this.passwords.get(username) !== password) return undefined;
    this.patch(p.id, (x) => ({ ...x, lastLoginAt: new Date().toISOString() }));
    return p;
  }

  private patch(id: string, fn: (p: Project) => Project) {
    this._projects.update((list) => list.map((p) => (p.id === id ? fn(p) : p)));
  }
}

function seedPhotos(prefix: string, count: number): ProjectPhoto[] {
  return Array.from({ length: count }, (_, i) => {
    const portrait = i % 3 === 1;
    const [w, h] = portrait ? [800, 1100] : [1200, 800];
    const seed = `${prefix}-${i}`;
    return {
      id: `ph_${seed}`,
      name: `IMG_${String(4021 + i).padStart(4, '0')}.jpg`,
      url: imageUrl(seed, w * 2, h * 2),
      thumbUrl: imageUrl(seed, w, h),
      size: 4_200_000 + ((i * 731_293) % 3_900_000),
      uploadedAt: '2026-10-12T10:00:00Z',
    };
  });
}

const SEED: Project[] = [
  {
    id: 'p_wedding',
    title: 'Wedding Day',
    date: '2026-09-20',
    customerName: 'Ana & Mihai',
    customerEmail: 'ana.mihai@example.com',
    username: 'ana.mihai',
    createdAt: '2026-09-21T09:00:00Z',
    active: true,
    sentAt: '2026-10-12T10:00:00Z',
    lastLoginAt: '2026-10-28T19:24:00Z',
    photos: seedPhotos('sg-ana-wed', 24),
  },
  {
    id: 'p_elena',
    title: 'Studio Portraits',
    date: '2026-10-30',
    customerName: 'Elena Radu',
    customerEmail: 'elena@example.com',
    username: 'elena.portraits',
    createdAt: '2026-10-30T09:00:00Z',
    active: true,
    photos: seedPhotos('sg-elena', 8),
  },
  {
    id: 'p_engagement',
    title: 'Engagement Session',
    date: '2026-07-11',
    customerName: 'Ana & Mihai',
    customerEmail: 'ana.mihai@example.com',
    username: 'ana.engagement',
    createdAt: '2026-07-12T09:00:00Z',
    active: true,
    sentAt: '2026-07-25T10:00:00Z',
    photos: seedPhotos('sg-ana-eng', 12),
  },
  {
    id: 'p_popescu',
    title: 'Summer by the Sea',
    date: '2026-06-28',
    customerName: 'Popescu Family',
    customerEmail: 'popescu@example.com',
    username: 'popescu.summer',
    createdAt: '2026-06-29T09:00:00Z',
    active: false,
    sentAt: '2026-07-03T10:00:00Z',
    lastLoginAt: '2026-07-04T08:10:00Z',
    photos: seedPhotos('sg-pop', 16),
  },
];
