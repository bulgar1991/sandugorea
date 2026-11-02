import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { introDelayMs } from '@components/preloader/preloader.component';
import { HERO_SLIDES } from '@/data/portfolio.data';

const SLIDE_MS = 6500;

/** Full-screen banner: crossfading slideshow with a slow zoom and a staggered title. */
@Component({
  selector: 'app-hero',
  imports: [RouterLink, TranslatePipe, IconComponent],
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--intro]': 'introDelay + "ms"', '[style.--slide-ms]': 'slideMs + "ms"' },
})
export class HeroComponent {
  protected readonly slides = HERO_SLIDES;
  protected readonly introDelay = introDelayMs();
  protected readonly slideMs = SLIDE_MS;
  protected readonly active = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const t = setInterval(() => {
        if (!document.hidden) this.active.update((i) => (i + 1) % this.slides.length);
      }, SLIDE_MS);
      destroyRef.onDestroy(() => clearInterval(t));
    });
  }
}
