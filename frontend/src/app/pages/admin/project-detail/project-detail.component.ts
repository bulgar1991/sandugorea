import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import { ModalComponent } from '@components/modal/modal.component';
import { ToastService } from '@components/toast/toast.service';
import { LightboxItem } from '@models/photo.models';
import { projectStatus } from '@models/project.models';
import { ProjectStore } from '@services/project-store.service';
import { formatBytes, generatePassword, uid } from '@/utils/format';

interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
}

const MAX_FILE_BYTES = 50 * 1024 * 1024;

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, DatePipe, DecimalPipe, IconComponent, ModalComponent, LightboxComponent],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailComponent {
  private readonly store = inject(ProjectStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** Route param. */
  readonly id = input.required<string>();

  protected readonly project = computed(() => this.store.project(this.id()));
  protected readonly status = computed(() => {
    const p = this.project();
    return p ? projectStatus(p) : 'draft';
  });
  protected readonly totalSize = computed(() =>
    formatBytes(this.project()?.photos.reduce((s, p) => s + p.size, 0) ?? 0),
  );
  protected readonly lightboxItems = computed<LightboxItem[]>(
    () => this.project()?.photos.map((p) => ({ src: p.url, title: p.name })) ?? [],
  );
  protected readonly openIndex = signal<number | null>(null);

  // Uploads (simulated until the API exists)
  protected readonly uploads = signal<UploadItem[]>([]);
  protected readonly dragging = signal(false);

  // Dialogs
  protected readonly confirmSend = signal(false);
  protected readonly confirmDelete = signal(false);
  protected readonly deleteText = signal('');
  protected readonly newPassword = signal<string | null>(null);

  protected readonly formatBytes = formatBytes;

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
   * MOCK: animates progress and adds a local preview. The real version streams each file to
   * POST /api/admin/projects/{id}/photos with HttpClient progress events.
   */
  private upload(files: FileList) {
    const projectId = this.id();
    const accepted = Array.from(files).filter(
      (f) => f.type.startsWith('image/') && f.size <= MAX_FILE_BYTES,
    );
    const rejected = files.length - accepted.length;
    if (rejected) this.toast.show(`${rejected} file(s) skipped (images up to 50 MB only)`, 'error');

    for (const file of accepted) {
      const item: UploadItem = { id: uid(), name: file.name, size: file.size, progress: 0 };
      this.uploads.update((u) => [...u, item]);
      const timer = setInterval(() => {
        item.progress = Math.min(100, item.progress + 8 + Math.random() * 18);
        this.uploads.update((u) => u.map((x) => (x.id === item.id ? { ...item } : x)));
        if (item.progress >= 100) {
          clearInterval(timer);
          const url = URL.createObjectURL(file);
          this.store.addPhoto(projectId, { name: file.name, url, thumbUrl: url, size: file.size });
          setTimeout(() => this.uploads.update((u) => u.filter((x) => x.id !== item.id)), 600);
        }
      }, 140);
    }
  }

  protected deletePhoto(photoId: string) {
    this.store.deletePhoto(this.id(), photoId);
  }

  protected send() {
    const p = this.project();
    if (!p) return;
    this.store.send(p.id);
    this.confirmSend.set(false);
    this.toast.show(`Login details sent to ${p.customerEmail}`);
  }

  protected toggleAccess() {
    const p = this.project();
    if (!p) return;
    this.store.setActive(p.id, !p.active);
    this.toast.show(p.active ? 'Customer access disabled' : 'Customer access enabled', 'info');
  }

  protected resetPassword() {
    const pwd = generatePassword();
    this.store.resetPassword(this.id(), pwd);
    this.newPassword.set(pwd);
  }

  protected deleteProject() {
    const p = this.project();
    if (!p || this.deleteText() !== p.username) return;
    this.store.delete(p.id);
    this.toast.show(`Project “${p.title}” deleted`, 'info');
    this.router.navigateByUrl('/admin/projects');
  }

  protected async copy(text: string) {
    await navigator.clipboard.writeText(text);
    this.toast.show('Copied', 'info', 2000);
  }
}
