import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { LightboxComponent } from '@components/lightbox/lightbox.component';
import { RevealDirective } from '@directives/reveal.directive';
import { LightboxItem } from '@models/photo.models';
import { AuthService } from '@services/auth.service';
import { GalleryStore } from '@services/gallery-store.service';
import { formatBytes } from '@/utils/format';

@Component({
  selector: 'app-client-gallery',
  imports: [RouterLink, DatePipe, IconComponent, LightboxComponent, RevealDirective],
  templateUrl: './client-gallery.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientGalleryComponent {
  private readonly store = inject(GalleryStore);
  private readonly session = inject(AuthService).session;

  /** Route param. */
  readonly id = input.required<string>();

  /** Mock authorisation - the API will enforce this server-side. */
  protected readonly gallery = computed(() => {
    const g = this.store.gallery(this.id());
    return g && g.sentAt && g.clientId === this.session()?.clientId ? g : undefined;
  });

  protected readonly totalSize = computed(() =>
    formatBytes(this.gallery()?.photos.reduce((s, p) => s + p.size, 0) ?? 0),
  );

  protected readonly items = computed<LightboxItem[]>(
    () => this.gallery()?.photos.map((p) => ({ src: p.url, downloadName: p.name })) ?? [],
  );

  protected readonly openIndex = signal<number | null>(null);
  protected readonly zipState = signal<'idle' | 'preparing'>('idle');

  protected downloadAll() {
    // TODO: GET /api/client/galleries/{id}/zip (streamed by the backend).
    this.zipState.set('preparing');
    setTimeout(() => this.zipState.set('idle'), 2000);
  }
}
