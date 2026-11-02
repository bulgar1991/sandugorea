import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import { ModalComponent } from '@components/modal/modal.component';
import { ToastService } from '@components/toast/toast.service';
import { LightboxItem } from '@models/photo.models';
import { GalleryStore } from '@services/gallery-store.service';
import { formatBytes, generatePassword, uid } from '@/utils/format';

interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
}

const MAX_FILE_BYTES = 50 * 1024 * 1024;

@Component({
  selector: 'app-client-detail',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    IconComponent,
    ModalComponent,
    LightboxComponent,
  ],
  templateUrl: './client-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientDetailComponent {
  private readonly store = inject(GalleryStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  /** Route param. */
  readonly id = input.required<string>();
  /** Optional ?gallery= query param to preselect a folder. */
  readonly gallery = input<string>();

  protected readonly client = computed(() => this.store.client(this.id()));
  protected readonly galleries = computed(() => this.store.galleriesFor(this.id()));

  protected readonly selectedId = linkedSignal(
    () => this.gallery() ?? this.galleries()[0]?.id ?? null,
  );
  protected readonly selected = computed(() =>
    this.galleries().find((g) => g.id === this.selectedId()),
  );
  protected readonly selectedSize = computed(() =>
    formatBytes(this.selected()?.photos.reduce((s, p) => s + p.size, 0) ?? 0),
  );
  protected readonly lightboxItems = computed<LightboxItem[]>(
    () => this.selected()?.photos.map((p) => ({ src: p.url, title: p.name })) ?? [],
  );
  protected readonly openIndex = signal<number | null>(null);

  // --- New gallery ---
  protected readonly newGalleryOpen = signal(false);
  protected readonly galleryForm = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(80)]],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
  });

  // --- Uploads (simulated until the API exists) ---
  protected readonly uploads = signal<UploadItem[]>([]);
  protected readonly dragging = signal(false);

  // --- Dialogs ---
  protected readonly confirmSend = signal(false);
  protected readonly confirmDeleteGallery = signal(false);
  protected readonly confirmDeleteClient = signal(false);
  protected readonly newPassword = signal<string | null>(null);
  protected readonly deleteConfirmText = signal('');

  protected formatBytes = formatBytes;

  protected createGallery() {
    if (this.galleryForm.invalid) {
      this.galleryForm.markAllAsTouched();
      return;
    }
    const { title, date } = this.galleryForm.getRawValue();
    const g = this.store.createGallery(this.id(), title, date);
    this.selectedId.set(g.id);
    this.newGalleryOpen.set(false);
    this.galleryForm.reset({ title: '', date: new Date().toISOString().slice(0, 10) });
    this.toast.show(`Folder “${title}” created`);
  }

  protected onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging.set(false);
    if (e.dataTransfer?.files) this.upload(e.dataTransfer.files);
  }

  protected onFiles(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) this.upload(input.files);
    input.value = '';
  }

  /**
   * MOCK: animates progress and adds a local preview. The real version will stream each file
   * to POST /api/admin/galleries/{id}/photos with HttpClient progress events.
   */
  private upload(files: FileList) {
    const galleryId = this.selectedId();
    if (!galleryId) return;

    const accepted = Array.from(files).filter(
      (f) => f.type.startsWith('image/') && f.size <= MAX_FILE_BYTES,
    );
    const rejected = files.length - accepted.length;
    if (rejected) this.toast.show(`${rejected} file(s) skipped (images up to 50 MB only)`, 'error');

    for (const file of accepted) {
      const item: UploadItem = { id: uid(), name: file.name, size: file.size, progress: 0 };
      this.uploads.update((u) => [...u, item]);
      const timer = setInterval(() => {
        const next = Math.min(100, item.progress + 8 + Math.random() * 18);
        item.progress = next;
        this.uploads.update((u) => u.map((x) => (x.id === item.id ? { ...item } : x)));
        if (next >= 100) {
          clearInterval(timer);
          const url = URL.createObjectURL(file);
          this.store.addPhoto(galleryId, { name: file.name, url, thumbUrl: url, size: file.size });
          setTimeout(() => this.uploads.update((u) => u.filter((x) => x.id !== item.id)), 600);
        }
      }, 140);
    }
  }

  protected deletePhoto(photoId: string) {
    const g = this.selected();
    if (g) this.store.deletePhoto(g.id, photoId);
  }

  protected send() {
    const g = this.selected();
    const c = this.client();
    if (!g || !c) return;
    this.store.sendGallery(g.id);
    this.confirmSend.set(false);
    this.toast.show(`“${g.title}” sent to ${c.email}`);
  }

  protected deleteGallery() {
    const g = this.selected();
    if (!g) return;
    this.store.deleteGallery(g.id);
    this.selectedId.set(this.galleries()[0]?.id ?? null);
    this.confirmDeleteGallery.set(false);
    this.toast.show(`Folder “${g.title}” deleted`, 'info');
  }

  protected toggleAccess() {
    const c = this.client();
    if (!c) return;
    this.store.setActive(c.id, !c.active);
    this.toast.show(
      c.active ? `Access disabled for ${c.name}` : `Access enabled for ${c.name}`,
      'info',
    );
  }

  protected resetPassword() {
    const c = this.client();
    if (!c) return;
    const pwd = generatePassword();
    this.store.resetPassword(c.id, pwd);
    this.newPassword.set(pwd);
  }

  protected deleteClient() {
    const c = this.client();
    if (!c || this.deleteConfirmText() !== c.username) return;
    this.store.deleteClient(c.id);
    this.toast.show(`${c.name} deleted`, 'info');
    this.router.navigateByUrl('/admin/clients');
  }

  protected async copy(text: string) {
    await navigator.clipboard.writeText(text);
    this.toast.show('Copied', 'info', 2000);
  }
}
