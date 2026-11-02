import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AboutSectionComponent } from '@components/about-section/about-section.component';
import { CountersComponent } from '@components/counters/counters.component';
import { CtaBandComponent } from '@components/cta-band/cta-band.component';
import { PageBannerComponent } from '@components/page-banner/page-banner.component';
import { SocialLinksComponent } from '@components/social-links/social-links.component';
import { TestimonialsComponent } from '@components/testimonials/testimonials.component';
import { BANNER_IMAGES } from '@/data/portfolio.data';

@Component({
  selector: 'app-about-page',
  imports: [
    PageBannerComponent,
    AboutSectionComponent,
    CountersComponent,
    TestimonialsComponent,
    SocialLinksComponent,
    CtaBandComponent,
  ],
  template: `
    <app-page-banner
      [image]="image"
      eyebrow="pages.about.eyebrow"
      title="pages.about.title"
      subtitle="pages.about.subtitle"
      crumb="nav.about"
    />
    <app-about-section mode="full" />
    <app-counters class="about-page__counters" />
    <app-testimonials />
    <app-social-links />
    <app-cta-band />
  `,
  styles: `
    .about-page__counters {
      @apply block border-y border-line bg-surface py-20;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent {
  protected readonly image = BANNER_IMAGES.about;
}
