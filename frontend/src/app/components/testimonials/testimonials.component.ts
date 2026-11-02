import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import Swiper from 'swiper';
import { A11y, Autoplay, Keyboard, Navigation, Pagination } from 'swiper/modules';
import { IconComponent } from '@components/icon/icon.component';
import { RevealDirective } from '@directives/reveal.directive';
import { TESTIMONIALS } from '@/data/portfolio.data';
import { EyebrowComponent, TitleComponent } from '@ui/typography/typography.component';
import { ContainerComponent } from '@ui/container/container.component';

/** Testimonials carousel (Swiper), same setup as the services slider in swisscleangroup. */
@Component({
  selector: 'app-testimonials',
  imports: [
    TitleComponent,
    EyebrowComponent,
    ContainerComponent,
    TranslatePipe,
    IconComponent,
    RevealDirective,
  ],
  templateUrl: './testimonials.component.html',
  styleUrl: './testimonials.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestimonialsComponent implements OnDestroy {
  protected readonly testimonials = TESTIMONIALS;
  protected readonly stars = [1, 2, 3, 4, 5];

  private readonly swiperEl = viewChild.required<ElementRef<HTMLElement>>('swiperEl');
  private readonly prevEl = viewChild.required<ElementRef<HTMLElement>>('prevEl');
  private readonly nextEl = viewChild.required<ElementRef<HTMLElement>>('nextEl');
  private readonly paginationEl = viewChild.required<ElementRef<HTMLElement>>('paginationEl');

  private swiper?: Swiper;

  constructor() {
    // Browser only - Swiper needs the real DOM.
    afterNextRender(() => {
      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.swiper = new Swiper(this.swiperEl().nativeElement, {
        modules: [Navigation, Pagination, Autoplay, Keyboard, A11y],
        slidesPerView: 1.08,
        spaceBetween: 16,
        speed: 900,
        grabCursor: true,
        keyboard: { enabled: true, onlyInViewport: true },
        autoplay: reduceMotion
          ? false
          : { delay: 6000, disableOnInteraction: false, pauseOnMouseEnter: true },
        pagination: { el: this.paginationEl().nativeElement, clickable: true },
        navigation: { prevEl: this.prevEl().nativeElement, nextEl: this.nextEl().nativeElement },
        breakpoints: {
          768: { slidesPerView: 2, spaceBetween: 24 },
          1200: { slidesPerView: 3, spaceBetween: 32 },
        },
      });
    });
  }

  ngOnDestroy(): void {
    this.swiper?.destroy();
  }
}
