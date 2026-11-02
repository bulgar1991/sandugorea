import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import { RevealDirective } from '@directives/reveal.directive';
import { LightboxItem } from '@models/photo.models';
import { CustomerProject } from '@models/project.models';
import { LocalDatePipe } from '@pipes/local-date.pipe';
import { ProjectsApi } from '@services/projects-api.service';
import { formatBytes } from '@/utils/format';

/** The one project the signed-in customer has access to (the API decides which). */
@Component({
  selector: 'app-client-project',
  imports: [LocalDatePipe, TranslatePipe, IconComponent, LightboxComponent, RevealDirective],
  templateUrl: './client-project.component.html',
  styleUrl: './client-project.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientProjectComponent {
  protected readonly project = signal<CustomerProject | null>(null);
  protected readonly loaded = signal(false);

  protected readonly cover = computed(() => this.project()?.photos[0]?.previewUrl);
  protected readonly totalSize = computed(() => formatBytes(this.project()?.totalBytes ?? 0));
  protected readonly items = computed<LightboxItem[]>(
    () =>
      this.project()?.photos.map((p) => ({
        src: p.previewUrl,
        download: `${p.originalUrl}?download=true`,
        downloadName: p.name,
      })) ?? [],
  );

  protected readonly openIndex = signal<number | null>(null);
  protected readonly zipUrl = '/api/customer/project/zip';

  constructor() {
    inject(ProjectsApi)
      .customerProject()
      .then((p) => this.project.set(p))
      .finally(() => this.loaded.set(true));
  }
}
