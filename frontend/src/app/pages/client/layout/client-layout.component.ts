import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { AuthService } from '@services/auth.service';
import { BRAND } from '@/data/portfolio.data';

@Component({
  selector: 'app-client-layout',
  imports: [RouterOutlet, RouterLink, IconComponent],
  template: `
    <header class="portal-bar">
      <div class="wrapper portal-bar__inner">
        <a routerLink="/client" class="portal-bar__logo">
          <span class="portal-bar__name">{{ brand.name }}</span>
          <span class="portal-bar__tagline">Private project</span>
        </a>
        <div class="portal-bar__user">
          <span class="portal-bar__customer">
            <app-icon name="user" [size]="16" />
            {{ auth.session()?.displayName }}
          </span>
          <button type="button" class="btn btn--ghost btn--sm" (click)="auth.logout()">
            <app-icon name="logout" [size]="14" />
            <span class="portal-bar__signout">Sign out</span>
          </button>
        </div>
      </div>
    </header>
    <main class="portal-main">
      <router-outlet />
    </main>
    <footer class="wrapper portal-footer">
      These photographs are private and shared only with you. © {{ brand.name }}
    </footer>
  `,
  styles: `
    .portal-bar {
      @apply sticky top-0 z-header border-b border-line bg-black/90 backdrop-blur-md;

      &__inner {
        @apply flex h-header items-center justify-between gap-6;
      }
      &__logo {
        @apply flex flex-col leading-none;
      }
      &__name {
        @apply font-display text-xl uppercase tracking-caps-md;
      }
      &__tagline {
        @apply mt-1 text-2xs uppercase tracking-caps-xl text-accent;
      }
      &__user {
        @apply flex items-center gap-4;
      }
      &__customer {
        @apply hidden items-center gap-2 text-sm text-ink-muted sm:flex;
      }
      &__signout {
        @apply hidden sm:inline;
      }
    }
    .portal-main {
      @apply min-h-[calc(100svh-5rem)];
    }
    .portal-footer {
      @apply border-t border-line py-8 text-xs text-ink-subtle;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientLayoutComponent {
  protected readonly auth = inject(AuthService);
  protected readonly brand = BRAND;
}
