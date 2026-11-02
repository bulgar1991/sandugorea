import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent, IconName } from '@components/icon/icon.component';
import { ToastsComponent } from '@components/toast/toast.component';
import { ADMIN_IDLE_TIMEOUT_MS, AuthService } from '@services/auth.service';
import { BRAND } from '@/data/portfolio.data';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ToastsComponent],
  templateUrl: './admin-layout.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:pointerdown)': 'touch()',
    '(document:keydown)': 'touch()',
    '(document:mousemove)': 'touch()',
  },
})
export class AdminLayoutComponent {
  protected readonly auth = inject(AuthService);
  protected readonly brand = BRAND;
  protected readonly navOpen = signal(false);

  protected readonly nav: { path: string; label: string; icon: IconName; exact: boolean }[] = [
    { path: '/admin', label: 'Dashboard', icon: 'grid', exact: true },
    { path: '/admin/clients', label: 'Clients', icon: 'users', exact: false },
    { path: '/admin/security', label: 'Security', icon: 'shield', exact: false },
  ];

  /** Inactivity auto sign-out. */
  private lastActivity = Date.now();
  protected readonly remainingMs = signal(ADMIN_IDLE_TIMEOUT_MS);
  protected readonly remaining = computed(() => {
    const s = Math.max(0, Math.floor(this.remainingMs() / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });
  protected readonly expiringSoon = computed(() => this.remainingMs() < 2 * 60_000);

  constructor() {
    inject(Meta).updateTag({ name: 'robots', content: 'noindex, nofollow' });
    const destroyRef = inject(DestroyRef);

    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.navOpen.set(false));

    afterNextRender(() => {
      const t = setInterval(() => {
        const left = ADMIN_IDLE_TIMEOUT_MS - (Date.now() - this.lastActivity);
        this.remainingMs.set(left);
        if (left <= 0) this.auth.logout();
      }, 1000);
      destroyRef.onDestroy(() => clearInterval(t));
    });
  }

  /** Cheap: just stores a number, no change detection. */
  protected touch() {
    this.lastActivity = Date.now();
  }
}
