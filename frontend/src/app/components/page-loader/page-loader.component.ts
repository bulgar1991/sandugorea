import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  Router,
} from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { PageLoaderState } from '@services/page-loader.service';
import { BRAND } from '@/data/portfolio.data';

// Keeps the loader on screen at least this long, so fast navigations don't just flicker.
const MIN_VISIBLE_MS = 400;

/** Path without query string or #fragment. */
const pathOf = (url: string) => url.split(/[?#]/)[0];

/**
 * Full-screen loader shown on the first load (taking over from the copy in index.html)
 * and while navigating between pages. Jumping to a section (#about) or changing a filter
 * (?new=1) on the same page doesn't show it.
 */
@Component({
  selector: 'app-page-loader',
  imports: [TranslatePipe],
  templateUrl: './page-loader.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageLoaderComponent {
  private readonly router = inject(Router);
  protected readonly state = inject(PageLoaderState);
  protected readonly name = BRAND.owner;

  private shownAt = Date.now();
  private hideTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        // First navigation (app start) or a different page -> show.
        if (!this.router.navigated || pathOf(event.url) !== pathOf(this.router.url)) this.show();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError ||
        event instanceof NavigationSkipped
      ) {
        this.hide();
      }
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.hideTimer));
  }

  private show(): void {
    clearTimeout(this.hideTimer);
    if (!this.state.visible()) {
      this.shownAt = Date.now();
      this.state.visible.set(true);
    }
  }

  private hide(): void {
    clearTimeout(this.hideTimer);
    if (!this.state.visible()) return;
    const remaining = MIN_VISIBLE_MS - (Date.now() - this.shownAt);
    this.hideTimer = setTimeout(() => this.state.visible.set(false), Math.max(0, remaining));
  }
}
