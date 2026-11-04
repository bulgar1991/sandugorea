import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { DriveCardComponent } from '@components/drive-card/drive-card.component';
import { IconComponent, IconName } from '@components/icon/icon.component';
import { ToastService } from '@components/toast/toast.service';
import { RevealDirective } from '@directives/reveal.directive';
import { ProjectSummary, STATUS_BADGE, Stats, projectStatus } from '@models/project.models';
import { LocalDatePipe } from '@pipes/local-date.pipe';
import { ProjectsApi } from '@services/projects-api.service';
import { formatBytes } from '@/utils/format';
import { ButtonComponent } from '@ui/button/button.component';
import { LinkComponent } from '@ui/link/link.component';
import { EyebrowComponent, TitleComponent } from '@ui/typography/typography.component';
import { CardComponent } from '@ui/card/card.component';
import { BadgeComponent } from '@ui/badge/badge.component';
import { PageHeadComponent } from '@ui/page-head/page-head.component';

@Component({
  selector: 'app-dashboard',
  imports: [
    ButtonComponent,
    LinkComponent,
    TitleComponent,
    EyebrowComponent,
    CardComponent,
    BadgeComponent,
    PageHeadComponent,
    RouterLink,
    LocalDatePipe,
    TranslatePipe,
    IconComponent,
    RevealDirective,
    DriveCardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly api = inject(ProjectsApi);
  protected readonly today = new Date();
  protected readonly status = projectStatus;
  protected readonly badge = STATUS_BADGE;

  private readonly stats = signal<Stats | null>(null);
  private readonly projects = signal<ProjectSummary[]>([]);

  protected readonly cards = computed<
    { label: string; value: string; hint: string; params?: object; icon: IconName }[]
  >(() => {
    const s = this.stats();
    const c = 'admin.dashboard.cards.';
    const v = (n: number | undefined) => (n === undefined ? '–' : n.toLocaleString());
    return [
      {
        label: c + 'projects',
        value: v(s?.projects),
        hint: c + 'projectsHint',
        params: { n: s?.drafts ?? 0 },
        icon: 'folder',
      },
      { label: c + 'delivered', value: v(s?.delivered), hint: c + 'deliveredHint', icon: 'send' },
      { label: c + 'photos', value: v(s?.photos), hint: c + 'photosHint', icon: 'image' },
      {
        label: c + 'storage',
        value: s ? formatBytes(s.bytes) : '–',
        hint: c + 'storageHint',
        icon: 'upload',
      },
    ];
  });

  protected readonly recent = computed(() =>
    [...this.projects()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6),
  );

  constructor() {
    this.api.stats().then((s) => this.stats.set(s));
    this.api.list().then((p) => this.projects.set(p));
    this.showDriveResult();
  }

  /** Back from Google's consent screen: /admin?drive=connected|error|cancelled. */
  private showDriveResult() {
    const result = inject(ActivatedRoute).snapshot.queryParamMap.get('drive');
    if (!result) return;
    const tone = result === 'connected' ? 'success' : result === 'cancelled' ? 'info' : 'error';
    const key = ['connected', 'cancelled'].includes(result) ? result : 'error';
    inject(ToastService).show(`admin.drive.toasts.${key}`, undefined, tone, 6000);
    inject(Router).navigate([], { queryParams: {}, replaceUrl: true });
  }
}
