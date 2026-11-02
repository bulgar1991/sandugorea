import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
} from '@angular/core';
import { AboutSectionComponent } from '@components/about-section/about-section.component';
import { BookingComponent } from '@components/booking/booking.component';
import { HeroComponent } from '@components/hero/hero.component';
import { MarqueeComponent } from '@components/marquee/marquee.component';
import { ShowcaseComponent } from '@components/showcase/showcase.component';
import { TestimonialsComponent } from '@components/testimonials/testimonials.component';
import { WorksComponent } from '@components/works/works.component';
import { ActiveSectionService } from '@services/active-section.service';
import { CATEGORIES } from '@/data/portfolio.data';

/** One-page site: banner, about, showcase, works, testimonials, booking (footer is in the layout). */
@Component({
  selector: 'app-home',
  imports: [
    HeroComponent,
    AboutSectionComponent,
    MarqueeComponent,
    ShowcaseComponent,
    WorksComponent,
    TestimonialsComponent,
    BookingComponent,
  ],
  templateUrl: './home.component.html',
  styles: `
    .home__section {
      @apply block scroll-mt-header;
    }
    #home {
      @apply scroll-mt-0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnDestroy {
  private readonly sections = inject(ActiveSectionService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly marqueeKeys = CATEGORIES.map((c) => c.labelKey);

  constructor() {
    afterNextRender(() =>
      this.sections.watch(Array.from(this.host.nativeElement.querySelectorAll('[id]'))),
    );
  }

  ngOnDestroy() {
    this.sections.stop();
  }
}
