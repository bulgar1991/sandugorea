import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent, IconName } from '@components/icon/icon.component';
import { RevealDirective } from '@directives/reveal.directive';
import { projectStatus } from '@models/project.models';
import { ProjectStore } from '@services/project-store.service';
import { formatBytes } from '@/utils/format';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, IconComponent, RevealDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly store = inject(ProjectStore);
  protected readonly today = new Date();
  protected readonly status = projectStatus;

  protected readonly cards = computed<
    { label: string; value: string; hint: string; icon: IconName }[]
  >(() => {
    const s = this.store.stats();
    return [
      {
        label: 'Projects',
        value: String(s.projects),
        hint: `${s.drafts} in progress`,
        icon: 'folder',
      },
      {
        label: 'Delivered',
        value: String(s.delivered),
        hint: 'customers with access',
        icon: 'send',
      },
      {
        label: 'Photos',
        value: s.photos.toLocaleString(),
        hint: 'across all projects',
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
    [...this.store.projects()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
  );
}
