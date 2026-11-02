import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AboutSectionComponent } from '@components/about-section/about-section.component';
import { CtaBandComponent } from '@components/cta-band/cta-band.component';
import { HeroComponent } from '@components/hero/hero.component';
import { MarqueeComponent } from '@components/marquee/marquee.component';
import { ShowcaseComponent } from '@components/showcase/showcase.component';
import { SocialLinksComponent } from '@components/social-links/social-links.component';
import { TestimonialsComponent } from '@components/testimonials/testimonials.component';
import { WorksComponent } from '@components/works/works.component';
import { CATEGORIES } from '@/data/portfolio.data';

/** Home: banner, about teaser, services showcase, latest works, testimonials, social, booking CTA. */
@Component({
  selector: 'app-home',
  imports: [
    HeroComponent,
    AboutSectionComponent,
    MarqueeComponent,
    ShowcaseComponent,
    WorksComponent,
    TestimonialsComponent,
    SocialLinksComponent,
    CtaBandComponent,
  ],
  template: `
    <app-hero />
    <app-about-section mode="teaser" />
    <app-marquee [items]="marqueeKeys" />
    <app-showcase />
    <app-works mode="teaser" />
    <app-testimonials />
    <app-social-links />
    <app-cta-band />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  protected readonly marqueeKeys = CATEGORIES.map((c) => c.labelKey);
}
