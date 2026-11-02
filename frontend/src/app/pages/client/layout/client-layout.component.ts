import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { AuthService } from '@services/auth.service';
import { BRAND } from '@/data/portfolio.data';

@Component({
  selector: 'app-client-layout',
  imports: [RouterOutlet, RouterLink, IconComponent],
  template: `
    <header class="sticky top-0 z-40 border-b border-line bg-black/90 backdrop-blur-md">
      <div class="container-x flex h-20 items-center justify-between gap-6">
        <a routerLink="/client" class="flex flex-col leading-none">
          <span class="font-display text-xl tracking-[0.25em] uppercase">{{ brand.name }}</span>
          <span class="mt-1 text-[0.55rem] tracking-[0.5em] text-accent uppercase"
            >Private gallery</span
          >
        </a>
        <div class="flex items-center gap-4">
          <span class="hidden items-center gap-2 text-sm text-ink-muted sm:flex">
            <app-icon name="user" [size]="16" />
            {{ auth.session()?.displayName }}
          </span>
          <button type="button" class="btn btn-ghost !px-4 !py-2.5" (click)="auth.logout()">
            <app-icon name="logout" [size]="14" />
            <span class="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
    <main class="min-h-[calc(100svh-5rem)]">
      <router-outlet />
    </main>
    <footer class="container-x border-t border-line py-8 text-xs text-ink-subtle">
      These photographs are private and shared only with you. © {{ brand.name }}
    </footer>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientLayoutComponent {
  protected readonly auth = inject(AuthService);
  protected readonly brand = BRAND;
}
