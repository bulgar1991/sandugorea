import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import { ModalComponent } from '@components/modal/modal.component';
import { ToastService } from '@components/toast/toast.service';
import { LightboxItem } from '@models/photo.models';
import { ProjectDetail, STATUS_BADGE, projectStatus } from '@models/project.models';
import { LocalDatePipe } from '@pipes/local-date.pipe';
import { ProjectsApi } from '@services/projects-api.service';
import { formatBytes, uid } from '@/utils/format';

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  state: 'queued' | 'uploading';
}

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const PARALLEL_UPLOADS = 2;

@Component({
  selector: 'app-project-detail',
  imports: [
    RouterLink,
    LocalDatePipe,
    TranslatePipe,
    DecimalPipe,
    IconComponent,
    ModalComponent,
    LightboxComponent,
  ],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailComponent {
  private readonly api = inject(ProjectsApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Route param. */
  readonly id = input.required<string>();

  protected readonly project = signal<ProjectDetail | null>(null);
  protected readonly notFound = signal(false);
  protected readonly status = computed(() => {
    const p = this.project();
    return p ? projectStatus(p) : 'draft';
  });
  protected readonly totalSize = computed(() =>
    formatBytes(this.project()?.photos.reduce((s, p) => s + p.size, 0) ?? 0),
  );
  protected readonly lightboxItems = computed<LightboxItem[]>(
    () => this.project()?.photos.map((p) => ({ src: p.previewUrl, title: p.name })) ?? [],
  );
  protected readonly openIndex = signal<number | null>(null);

  protected readonly uploads = signal<UploadItem[]>([]);
  protected readonly dragging = signal(false);
  private active = 0;

  protected readonly confirmSend = signal(false);
  protected readonly includePassword = signal(false);
  protected readonly sending = signal(false);
  protected readonly confirmDelete = signal(false);
  protected readonly deleteText = signal('');
  protected readonly newPassword = signal<string | null>(null);

  protected readonly formatBytes = formatBytes;
  protected readonly badge = STATUS_BADGE;
  protected readonly accept = ACCEPTED.join(',');

  constructor() {
    effect(() => {
      const id = this.id();
      this.api
        .get(id)
        .then((p) => this.project.set(p))
        .catch(() => this.notFound.set(true));
    });
  }

  private patch(fn: (p: ProjectDetail) => ProjectDetail) {
    this.project.update((p) => (p ? fn(p) : p));
  }

  protected onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging.set(false);
    if (e.dataTransfer?.files) this.enqueue(e.dataTransfer.files);
  }

  protected onFiles(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) this.enqueue(input.files);
    input.value = '';
  }

  private enqueue(files: FileList) {
    const all = Array.from(files);
    const ok = all.filter((f) => ACCEPTED.includes(f.type) && f.size <= MAX_FILE_BYTES);
    if (ok.length < all.length) {
      this.toast.show('admin.toasts.skipped', { n: all.length - ok.length }, 'error');
    }
    this.uploads.update((u) => [
      ...u,
      ...ok.map((file) => ({ id: uid(), file, progress: 0, state: 'queued' as const })),
    ]);
    this.pump();
  }

  /** Keeps PARALLEL_UPLOADS uploads running until the queue is empty. */
  private pump() {
    while (this.active < PARALLEL_UPLOADS) {
      const next = this.uploads().find((u) => u.state === 'queued');
      if (!next) return;
      this.active++;
      this.setUpload(next.id, { state: 'uploading' });
      this.api.upload(this.id(), next.file).subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.setUpload(next.id, { progress: (event.loaded / event.total) * 100 });
          } else if (event.type === HttpEventType.Response && event.body) {
            const photo = event.body;
            this.patch((p) => ({ ...p, photos: [...p.photos, photo] }));
          }
        },
        error: (err: unknown) => {
          const reason =
            err instanceof HttpErrorResponse && typeof err.error?.error === 'string'
              ? err.error.error
              : 'failed';
          this.toast.show(
            `admin.project.rejected.${reason}`,
            { name: next.file.name },
            'error',
            6000,
          );
          this.finishUpload(next.id);
        },
        complete: () => this.finishUpload(next.id),
      });
    }
  }

  private finishUpload(id: string) {
    if (!this.uploads().some((u) => u.id === id)) return;
    this.active--;
    this.uploads.update((u) => u.filter((x) => x.id !== id));
    this.pump();
  }

  private setUpload(id: string, change: Partial<UploadItem>) {
    this.uploads.update((u) => u.map((x) => (x.id === id ? { ...x, ...change } : x)));
  }

  protected async deletePhoto(photoId: string) {
    await this.api.deletePhoto(this.id(), photoId);
    this.patch((p) => ({ ...p, photos: p.photos.filter((x) => x.id !== photoId) }));
  }

  protected async send() {
    const p = this.project();
    if (!p || this.sending()) return;
    this.sending.set(true);
    try {
      const res = await this.api.send(p.id, this.includePassword());
      this.patch((x) => ({ ...x, sentAt: res.sentAt }));
      this.confirmSend.set(false);
      this.toast.show('admin.toasts.sent', { email: p.customerEmail });
      if (res.password) this.newPassword.set(res.password);
    } catch {
      this.toast.show('common.somethingWrong', undefined, 'error');
    } finally {
      this.sending.set(false);
    }
  }

  protected async toggleAccess() {
    const p = this.project();
    if (!p) return;
    await this.api.setActive(p.id, !p.active);
    this.patch((x) => ({ ...x, active: !p.active }));
    this.toast.show(
      p.active ? 'admin.toasts.accessDisabled' : 'admin.toasts.accessEnabled',
      undefined,
      'info',
    );
  }

  protected async resetPassword() {
    const { password } = await this.api.resetPassword(this.id());
    this.newPassword.set(password);
  }

  protected async deleteProject() {
    const p = this.project();
    if (!p || this.deleteText() !== p.username) return;
    await this.api.delete(p.id);
    this.toast.show('admin.toasts.projectDeleted', { title: p.title }, 'info');
    this.router.navigateByUrl('/admin/projects');
  }

  protected async copy(text: string) {
    await navigator.clipboard.writeText(text);
    this.toast.show('common.copied', undefined, 'info', 2000);
  }
}
