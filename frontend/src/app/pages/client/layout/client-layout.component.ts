import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { LanguageSwitcherComponent } from '@components/language-switcher/language-switcher.component';
import { AuthService } from '@services/auth.service';
import { BRAND } from '@/data/portfolio.data';
import { ButtonComponent } from '@ui/button/button.component';
import { ContainerComponent } from '@ui/container/container.component';

@Component({
  selector: 'app-client-layout',
  imports: [
    ButtonComponent,
    ContainerComponent,
    RouterOutlet,
    RouterLink,
    IconComponent,
    TranslatePipe,
    LanguageSwitcherComponent,
  ],
  template: `
    <header class="portal-bar">
      <div app-container class="portal-bar__inner">
        <a data-testid="client-layout-home" routerLink="/client" class="portal-bar__logo">
          <span class="portal-bar__name">{{ brand.owner }}</span>
          <span class="portal-bar__tagline">{{ 'client.layout.tagline' | translate }}</span>
        </a>
        <div class="portal-bar__user">
          <app-language-switcher />
          <span class="portal-bar__customer">
            <app-icon name="user" [size]="16" />
            {{ auth.session()?.displayName }}
          </span>
          <button
            data-testid="client-layout-logout"
            app-button
            variant="ghost"
            size="sm"
            type="button"
            (click)="auth.logout()"
          >
            <app-icon name="logout" [size]="14" />
            <span class="portal-bar__signout">{{ 'common.signOut' | translate }}</span>
          </button>
        </div>
      </div>
    </header>
    <main class="portal-main">
      <router-outlet />
    </main>
    <footer app-container class="portal-footer">
      {{ 'client.layout.private' | translate }} © {{ brand.name }}
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
        @apply font-script text-3xl leading-none;
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
