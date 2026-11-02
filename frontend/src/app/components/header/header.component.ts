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
import { filter } from 'rxjs';
import { IconComponent } from '@components/icon/icon.component';
import { BRAND } from '@/data/portfolio.data';

export const NAV_LINKS = [
  { path: '/', label: 'Home', exact: true },
  { path: '/portfolio', label: 'Portfolio', exact: false },
  { path: '/about', label: 'About', exact: false },
  { path: '/contact', label: 'Contact', exact: false },
];

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:scroll)': 'onScroll()' },
})
export class HeaderComponent {
  protected readonly links = NAV_LINKS;
  protected readonly brand = BRAND;
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
