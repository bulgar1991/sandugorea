import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { MarqueeComponent } from '@components/marquee/marquee.component';
import { introDelayMs } from '@components/preloader/preloader.component';
import { RevealDirective } from '@directives/reveal.directive';
import { CATEGORIES, HERO_SLIDES, TESTIMONIALS, imageUrl } from '@/data/portfolio.data';

const SLIDE_MS = 6500;
const QUOTE_MS = 8000;

@Component({
  selector: 'app-home',
  imports: [RouterLink, IconComponent, MarqueeComponent, RevealDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[style.--intro]': 'introDelay + "ms"', '[style.--slide-ms]': 'slideMs + "ms"' },
})
export class HomeComponent {
  protected readonly slides = HERO_SLIDES;
  protected readonly categories = CATEGORIES;
  protected readonly testimonials = TESTIMONIALS;
  protected readonly introDelay = introDelayMs();
  protected readonly slideMs = SLIDE_MS;
  protected readonly introImage = imageUrl('sg-intro', 1000, 1300);
  protected readonly ctaImage = imageUrl('sg-cta', 2400, 1400);
  protected readonly marqueeItems = CATEGORIES.map((c) => c.label);

  protected readonly activeSlide = signal(0);
  protected readonly activeQuote = signal(0);

  protected readonly steps = [
    {
      title: 'We talk',
      text: 'A relaxed conversation about you, your story and the feeling you want to keep.',
    },
    {
      title: 'We create',
      text: 'An unhurried session guided gently, with room for real moments to happen.',
    },
    {
      title: 'You receive',
      text: 'Your own private project folder with every edited photograph, opened only with your username and password.',
    },
  ];

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const slides = setInterval(() => {
        if (!document.hidden) this.activeSlide.update((i) => (i + 1) % this.slides.length);
      }, SLIDE_MS);
      const quotes = setInterval(() => {
        if (!document.hidden) this.activeQuote.update((i) => (i + 1) % this.testimonials.length);
      }, QUOTE_MS);
      destroyRef.onDestroy(() => {
        clearInterval(slides);
        clearInterval(quotes);
      });
    });
  }
}
