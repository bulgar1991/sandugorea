import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { IconComponent } from '@components/icon/icon.component';
import { LanguageSwitcherComponent } from '@components/language-switcher/language-switcher.component';
import { BRAND } from '@/data/portfolio.data';
import { LogoComponent } from '@components/logo/logo.component';
import { ButtonComponent } from '@ui/button/button.component';
import { LinkComponent } from '@ui/link/link.component';
import { ContainerComponent } from '@ui/container/container.component';

/** Site pages, in menu order. */
export const NAV_LINKS = [
  { path: '/', key: 'nav.home', exact: true },
  { path: '/about', key: 'nav.about', exact: false },
  { path: '/services', key: 'nav.services', exact: false },
  { path: '/portfolio', key: 'nav.portfolio', exact: false },
  { path: '/booking', key: 'nav.booking', exact: false },
];

@Component({
  selector: 'app-header',
  imports: [
    LogoComponent,
    RouterLinkActive,
    ButtonComponent,
    LinkComponent,
    ContainerComponent,
    RouterLink,
    TranslatePipe,
    IconComponent,
    LanguageSwitcherComponent,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:scroll)': 'onScroll()' },
})
export class HeaderComponent {
  protected readonly links = NAV_LINKS;
  protected readonly brand = BRAND;
  protected readonly barLinks = NAV_LINKS.filter((l) => l.path !== '/booking');
  protected readonly scrolled = signal(false);
  protected readonly hidden = signal(false);
  protected readonly menuOpen = signal(false);

  private lastY = 0;
  private ticking = false;

  constructor() {
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => {
        this.menuOpen.set(false);
        this.hidden.set(false);
      });

    effect(() => {
      document.body.style.overflow = this.menuOpen() ? 'hidden' : '';
    });
  }

  protected toggleMenu() {
    this.menuOpen.update((v) => !v);
  }

  /** rAF-throttled: at most one update per frame. */
  protected onScroll() {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      this.scrolled.set(y > 40);
      this.hidden.set(y > 400 && y > this.lastY);
      this.lastY = y;
      this.ticking = false;
    });
  }
}
