import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { IconComponent } from '@components/icon/icon.component';
import { LanguageSwitcherComponent } from '@components/language-switcher/language-switcher.component';
import { ActiveSectionService } from '@services/active-section.service';
import { BRAND } from '@/data/portfolio.data';
import { ButtonComponent } from '@ui/button/button.component';
import { LinkComponent } from '@ui/link/link.component';
import { ContainerComponent } from '@ui/container/container.component';

/** One-page sections, in page order. */
export const NAV_LINKS = [
  { fragment: 'home', key: 'nav.home' },
  { fragment: 'about', key: 'nav.about' },
  { fragment: 'works', key: 'nav.works' },
  { fragment: 'testimonials', key: 'nav.testimonials' },
  { fragment: 'booking', key: 'nav.booking' },
];

@Component({
  selector: 'app-header',
  imports: [
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
  protected readonly section = inject(ActiveSectionService).id;
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
