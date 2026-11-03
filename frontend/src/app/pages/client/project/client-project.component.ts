import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { GalleryCoverComponent } from '@components/gallery-cover/gallery-cover.component';
import { IconComponent } from '@components/icon/icon.component';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import { RevealDirective } from '@directives/reveal.directive';
import { LightboxItem } from '@models/photo.models';
import { CustomerProject } from '@models/project.models';
import { LocalDatePipe } from '@pipes/local-date.pipe';
import { ProjectsApi } from '@services/projects-api.service';
import { formatBytes } from '@/utils/format';
import { TextComponent, TitleComponent } from '@ui/typography/typography.component';
import { ContainerComponent } from '@ui/container/container.component';

/** The one project the signed-in customer has access to (the API decides which). */
@Component({
  selector: 'app-client-project',
  imports: [
    TitleComponent,
    TextComponent,
    ContainerComponent,
    LocalDatePipe,
    TranslatePipe,
    IconComponent,
    LightboxComponent,
    RevealDirective,
    GalleryCoverComponent,
  ],
  templateUrl: './client-project.component.html',
  styleUrl: './client-project.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientProjectComponent {
  protected readonly project = signal<CustomerProject | null>(null);
  protected readonly loaded = signal(false);

  /** Phone held upright: portrait photos fill the cover better than landscape ones. */
  private readonly portraitScreen = matchMedia('(orientation: portrait)').matches;

  /** Cover slideshow: photos matching the screen's shape first, then the rest. */
  protected readonly coverImages = computed(() => {
    const photos = this.project()?.photos ?? [];
    const fits = (p: { width: number; height: number }) =>
      this.portraitScreen ? p.height > p.width : p.width >= p.height;
    return [...photos.filter(fits), ...photos.filter((p) => !fits(p))].map((p) => p.previewUrl);
  });
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
  private readonly photos = viewChild('photos', { read: ElementRef });

  protected showPhotos() {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.photos()?.nativeElement.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }

  constructor() {
    inject(ProjectsApi)
      .customerProject()
      .then((p) => this.project.set(p))
      .finally(() => this.loaded.set(true));
  }
}
