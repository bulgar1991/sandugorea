import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CtaBandComponent } from '@components/cta-band/cta-band.component';
import { PageBannerComponent } from '@components/page-banner/page-banner.component';
import { WorksComponent } from '@components/works/works.component';
import { BANNER_IMAGES } from '@/data/portfolio.data';

@Component({
  selector: 'app-portfolio-page',
  imports: [PageBannerComponent, WorksComponent, CtaBandComponent],
  template: `
    <app-page-banner
      [image]="image"
      eyebrow="pages.portfolio.eyebrow"
      title="pages.portfolio.title"
      subtitle="pages.portfolio.subtitle"
      crumb="nav.portfolio"
    />
    <app-works mode="full" />
    <app-cta-band />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPageComponent {
  protected readonly image = BANNER_IMAGES.portfolio;
}
