import { Injectable, computed, signal } from '@angular/core';
import { ClientAccount, Gallery, GalleryPhoto } from '@models/client.models';
import { imageUrl } from '@/data/portfolio.data';
import { uid } from '@/utils/format';

/**
 * In-memory MOCK of the admin/client data. It mirrors the API the .NET backend will expose
 * (clients, galleries, photos), so components won't change when it's swapped for HTTP calls.
 * Nothing here is secure — it's for building the UI only.
 */
@Injectable({ providedIn: 'root' })
export class GalleryStore {
  private readonly _clients = signal<ClientAccount[]>(SEED_CLIENTS);
  private readonly _galleries = signal<Gallery[]>(SEED_GALLERIES);
  /** MOCK ONLY. The real backend stores salted hashes and never returns passwords. */
  private readonly passwords = new Map<string, string>([
    ['ana.mihai', 'demo1234'],
    ['elena.r', 'demo1234'],
    ['popescu.family', 'demo1234'],
  ]);

  readonly clients = this._clients.asReadonly();
  readonly galleries = this._galleries.asReadonly();

  readonly stats = computed(() => {
    const galleries = this._galleries();
    const photos = galleries.flatMap((g) => g.photos);
    return {
      clients: this._clients().length,
      activeClients: this._clients().filter((c) => c.active).length,
      galleries: galleries.length,
      sentGalleries: galleries.filter((g) => g.sentAt).length,
      photos: photos.length,
      bytes: photos.reduce((sum, p) => sum + p.size, 0),
    };
  });

  // Lookups read signals, so calling them inside a template or computed() stays reactive.

  client(id: string) {
    return this._clients().find((c) => c.id === id);
  }

  galleriesFor(clientId: string) {
    return this._galleries()
      .filter((g) => g.clientId === clientId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /** What a client can see: only galleries that were sent to them. */
  sentGalleriesFor(clientId: string) {
    return this.galleriesFor(clientId).filter((g) => g.sentAt);
  }

  gallery(id: string) {
    return this._galleries().find((g) => g.id === id);
  }

  usernameTaken(username: string) {
    return this._clients().some((c) => c.username.toLowerCase() === username.toLowerCase());
  }

  createClient(data: { name: string; email: string; username: string; password: string }) {
    const client: ClientAccount = {
      id: uid('c_'),
      name: data.name,
      email: data.email,
      username: data.username,
      createdAt: new Date().toISOString(),
      active: true,
    };
    this.passwords.set(data.username, data.password);
    this._clients.update((list) => [client, ...list]);
    return client;
  }

  setActive(clientId: string, active: boolean) {
    this._clients.update((list) => list.map((c) => (c.id === clientId ? { ...c, active } : c)));
  }

  resetPassword(clientId: string, password: string) {
    const client = this._clients().find((c) => c.id === clientId);
    if (client) this.passwords.set(client.username, password);
  }

  deleteClient(clientId: string) {
    const client = this._clients().find((c) => c.id === clientId);
    if (client) this.passwords.delete(client.username);
    this._clients.update((list) => list.filter((c) => c.id !== clientId));
    this._galleries.update((list) => list.filter((g) => g.clientId !== clientId));
  }

  createGallery(clientId: string, title: string, date: string) {
    const gallery: Gallery = { id: uid('g_'), clientId, title, date, photos: [] };
    this._galleries.update((list) => [gallery, ...list]);
    return gallery;
  }

  deleteGallery(galleryId: string) {
    this._galleries.update((list) => list.filter((g) => g.id !== galleryId));
  }

  addPhoto(galleryId: string, photo: Omit<GalleryPhoto, 'id' | 'uploadedAt'>) {
    const full: GalleryPhoto = { ...photo, id: uid('p_'), uploadedAt: new Date().toISOString() };
    this.patchGallery(galleryId, (g) => ({ ...g, photos: [...g.photos, full] }));
  }

  deletePhoto(galleryId: string, photoId: string) {
    this.patchGallery(galleryId, (g) => ({
      ...g,
      photos: g.photos.filter((p) => p.id !== photoId),
    }));
  }

  sendGallery(galleryId: string) {
    this.patchGallery(galleryId, (g) => ({ ...g, sentAt: new Date().toISOString() }));
  }

  /** MOCK ONLY — the server does this. */
  verifyClient(username: string, password: string): ClientAccount | undefined {
    const client = this._clients().find((c) => c.username === username && c.active);
    if (!client || this.passwords.get(username) !== password) return undefined;
    this._clients.update((list) =>
      list.map((c) => (c.id === client.id ? { ...c, lastLoginAt: new Date().toISOString() } : c)),
    );
    return client;
  }

  private patchGallery(id: string, fn: (g: Gallery) => Gallery) {
    this._galleries.update((list) => list.map((g) => (g.id === id ? fn(g) : g)));
  }
}

function seedPhotos(prefix: string, count: number): GalleryPhoto[] {
  return Array.from({ length: count }, (_, i) => {
    const portrait = i % 3 === 1;
    const [w, h] = portrait ? [800, 1100] : [1200, 800];
    const seed = `${prefix}-${i}`;
    return {
      id: `p_${seed}`,
      name: `IMG_${String(4021 + i).padStart(4, '0')}.jpg`,
      url: imageUrl(seed, w * 2, h * 2),
      thumbUrl: imageUrl(seed, w, h),
      size: 4_200_000 + ((i * 731_293) % 3_900_000),
      uploadedAt: '2026-10-12T10:00:00Z',
    };
  });
}

const SEED_CLIENTS: ClientAccount[] = [
  {
    id: 'c_ana',
    name: 'Ana & Mihai',
    email: 'ana.mihai@example.com',
    username: 'ana.mihai',
    createdAt: '2026-08-02T09:00:00Z',
    lastLoginAt: '2026-10-28T19:24:00Z',
    active: true,
  },
  {
    id: 'c_elena',
    name: 'Elena Radu',
    email: 'elena@example.com',
    username: 'elena.r',
    createdAt: '2026-09-14T09:00:00Z',
    active: true,
  },
  {
    id: 'c_popescu',
    name: 'Popescu Family',
    email: 'popescu@example.com',
    username: 'popescu.family',
    createdAt: '2026-06-20T09:00:00Z',
    lastLoginAt: '2026-07-04T08:10:00Z',
    active: false,
  },
];

const SEED_GALLERIES: Gallery[] = [
  {
    id: 'g_wedding',
    clientId: 'c_ana',
    title: 'Wedding Day',
    date: '2026-09-20',
    photos: seedPhotos('sg-ana-wed', 24),
    sentAt: '2026-10-12T10:00:00Z',
  },
  {
    id: 'g_engagement',
    clientId: 'c_ana',
    title: 'Engagement Session',
    date: '2026-07-11',
    photos: seedPhotos('sg-ana-eng', 12),
    sentAt: '2026-07-25T10:00:00Z',
  },
  {
    id: 'g_elena',
    clientId: 'c_elena',
    title: 'Studio Portraits',
    date: '2026-10-30',
    photos: seedPhotos('sg-elena', 8),
  },
  {
    id: 'g_popescu',
    clientId: 'c_popescu',
    title: 'Summer by the Sea',
    date: '2026-06-28',
    photos: seedPhotos('sg-pop', 16),
    sentAt: '2026-07-03T10:00:00Z',
  },
];
