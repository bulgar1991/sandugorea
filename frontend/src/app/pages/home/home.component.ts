import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AboutSectionComponent } from '@components/about-section/about-section.component';
import { CtaBandComponent } from '@components/cta-band/cta-band.component';
import { MarqueeComponent } from '@components/marquee/marquee.component';
import { SocialLinksComponent } from '@components/social-links/social-links.component';
import { TestimonialsComponent } from '@components/testimonials/testimonials.component';
import { WorksComponent } from '@components/works/works.component';
import { CATEGORIES } from '@/data/portfolio.data';

/** Home: about teaser, portfolio grid, marquee, social, testimonials, booking CTA. */
@Component({
  selector: 'app-home',
  imports: [
    AboutSectionComponent,
    MarqueeComponent,
    WorksComponent,
    TestimonialsComponent,
    SocialLinksComponent,
    CtaBandComponent,
  ],
  template: `
    <app-about-section mode="teaser" [lead]="true" />
    <app-works mode="teaser" />
    <app-marquee [items]="marqueeKeys" />
    <app-social-links />
    <app-testimonials />
    <app-cta-band />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  protected readonly marqueeKeys = CATEGORIES.map((c) => c.labelKey);
}
