import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { LocalDatePipe } from '@pipes/local-date.pipe';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import { RevealDirective } from '@directives/reveal.directive';
import { LightboxItem } from '@models/photo.models';
import { AuthService } from '@services/auth.service';
import { ProjectStore } from '@services/project-store.service';
import { formatBytes } from '@/utils/format';

/** The one project the signed-in customer has access to. */
@Component({
  selector: 'app-client-project',
  imports: [LocalDatePipe, TranslatePipe, IconComponent, LightboxComponent, RevealDirective],
  templateUrl: './client-project.component.html',
  styleUrl: './client-project.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientProjectComponent {
  private readonly store = inject(ProjectStore);
  private readonly session = inject(AuthService).session;

  /** Mock authorisation - the API enforces this server-side. */
  protected readonly project = computed(() => {
    const p = this.store.project(this.session()?.projectId ?? '');
    return p && p.active && p.sentAt ? p : undefined;
  });

  protected readonly cover = computed(() => this.project()?.photos[0]?.url);
  protected readonly totalSize = computed(() =>
    formatBytes(this.project()?.photos.reduce((s, p) => s + p.size, 0) ?? 0),
  );
  protected readonly items = computed<LightboxItem[]>(
    () => this.project()?.photos.map((p) => ({ src: p.url, downloadName: p.name })) ?? [],
  );

  protected readonly openIndex = signal<number | null>(null);
  protected readonly zipState = signal<'idle' | 'preparing'>('idle');

  protected downloadAll() {
    // TODO: GET /api/customer/project/zip (streamed by the backend).
    this.zipState.set('preparing');
    setTimeout(() => this.zipState.set('idle'), 2000);
  }
}
