import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent, IconName } from '@components/icon/icon.component';
import { LocalDatePipe } from '@pipes/local-date.pipe';
import { RevealDirective } from '@directives/reveal.directive';
import { STATUS_BADGE, projectStatus } from '@models/project.models';
import { ProjectStore } from '@services/project-store.service';
import { formatBytes } from '@/utils/format';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, LocalDatePipe, TranslatePipe, IconComponent, RevealDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly store = inject(ProjectStore);
  protected readonly today = new Date();
  protected readonly status = projectStatus;
  protected readonly badge = STATUS_BADGE;

  protected readonly cards = computed<
    { label: string; value: string; hint: string; params?: object; icon: IconName }[]
  >(() => {
    const s = this.store.stats();
    const c = 'admin.dashboard.cards.';
    return [
      {
        label: c + 'projects',
        value: String(s.projects),
        hint: c + 'projectsHint',
        params: { n: s.drafts },
        icon: 'folder',
      },
      {
        label: c + 'delivered',
        value: String(s.delivered),
        hint: c + 'deliveredHint',
        icon: 'send',
      },
      {
        label: c + 'photos',
        value: s.photos.toLocaleString(),
        hint: c + 'photosHint',
        icon: 'image',
      },
      {
        label: c + 'storage',
        value: formatBytes(s.bytes),
        hint: c + 'storageHint',
        icon: 'upload',
      },
    ];
  });

  protected readonly recent = computed(() =>
    [...this.store.projects()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
  );
}
