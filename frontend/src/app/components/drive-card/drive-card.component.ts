import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { ToastService } from '@components/toast/toast.service';
import { DriveStatus } from '@models/project.models';
import { ProjectsApi } from '@services/projects-api.service';
import { formatBytes } from '@/utils/format';
import { ButtonComponent } from '@ui/button/button.component';
import { CardComponent } from '@ui/card/card.component';
import { SpinnerComponent } from '@ui/spinner/spinner.component';
import { TitleComponent } from '@ui/typography/typography.component';

/** While originals are being moved, check again this often. */
const POLL_MS = 8000;

/**
 * Admin dashboard: the Google Drive that keeps the original photos - connect / disconnect,
 * space used, and how many originals are still waiting on the server to be moved.
 */
@Component({
  selector: 'app-drive-card',
  imports: [
    ButtonComponent,
    CardComponent,
    TitleComponent,
    SpinnerComponent,
    IconComponent,
    TranslatePipe,
  ],
  templateUrl: './drive-card.component.html',
  styleUrl: './drive-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DriveCardComponent {
  private readonly api = inject(ProjectsApi);
  private readonly toast = inject(ToastService);

  protected readonly status = signal<DriveStatus | null>(null);
  protected readonly busy = signal(false);
  protected readonly formatBytes = formatBytes;

  /** Connected, but Google refused the stored access (removed in the Google account). */
  protected readonly broken = computed(() => {
    const s = this.status();
    return !!s?.connected && s.usedBytes === null;
  });
  protected readonly usedShare = computed(() => {
    const s = this.status();
    return s?.usedBytes != null && s.limitBytes ? Math.min(1, s.usedBytes / s.limitBytes) : 0;
  });

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.load();
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  private async load() {
    clearTimeout(this.timer);
    try {
      const s = await this.api.driveStatus();
      this.status.set(s);
      if (s.connected && s.pendingPhotos > 0) this.timer = setTimeout(() => this.load(), POLL_MS);
    } catch {
      // Dashboard still works without this card's numbers.
    }
  }

  protected async connect() {
    this.busy.set(true);
    try {
      const { url } = await this.api.driveConnect();
      // Google's consent screen; it sends the browser back to /admin?drive=…
      window.location.assign(url);
    } catch {
      this.busy.set(false);
      this.toast.show('common.somethingWrong', undefined, 'error');
    }
  }

  protected async disconnect() {
    this.busy.set(true);
    try {
      await this.api.driveDisconnect();
      this.toast.show('admin.drive.toasts.disconnected', undefined, 'info');
      await this.load();
    } catch (err) {
      const inUse = err instanceof HttpErrorResponse && err.status === 409;
      this.toast.show(
        inUse ? 'admin.drive.toasts.inUse' : 'common.somethingWrong',
        undefined,
        'error',
        6000,
      );
    } finally {
      this.busy.set(false);
    }
  }
}
