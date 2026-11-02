import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, IconName } from '@components/icon/icon.component';
import { RevealDirective } from '@directives/reveal.directive';
import { GalleryStore } from '@services/gallery-store.service';
import { formatBytes } from '@/utils/format';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, IconComponent, RevealDirective],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly store = inject(GalleryStore);
  protected readonly today = new Date();

  protected readonly cards = computed<
    { label: string; value: string; hint: string; icon: IconName }[]
  >(() => {
    const s = this.store.stats();
    return [
      {
        label: 'Clients',
        value: String(s.clients),
        hint: `${s.activeClients} with access`,
        icon: 'users',
      },
      {
        label: 'Galleries',
        value: String(s.galleries),
        hint: `${s.sentGalleries} delivered`,
        icon: 'folder',
      },
      {
        label: 'Photos',
        value: s.photos.toLocaleString(),
        hint: 'across all galleries',
        icon: 'image',
      },
      {
        label: 'Storage',
        value: formatBytes(s.bytes),
        hint: 'originals on server',
        icon: 'upload',
      },
    ];
  });

  protected readonly recent = computed(() =>
    [...this.store.galleries()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6)
      .map((g) => ({ ...g, client: this.store.client(g.clientId) })),
  );
}
