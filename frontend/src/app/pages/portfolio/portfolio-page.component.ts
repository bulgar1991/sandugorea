import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CtaBandComponent } from '@components/cta-band/cta-band.component';
import { PageBannerComponent } from '@components/page-banner/page-banner.component';
import { WorksComponent } from '@components/works/works.component';
import { PhotoCategory } from '@models/photo.models';
import { LocalizePipe } from '@pipes/localize.pipe';
import { ContainerComponent } from '@ui/container/container.component';
import { BANNER_IMAGES, CATEGORIES } from '@/data/portfolio.data';

/** /portfolio (all photos) and /portfolio/<category> (one category, from the route data). */
@Component({
  selector: 'app-portfolio-page',
  imports: [
    PageBannerComponent,
    WorksComponent,
    CtaBandComponent,
    ContainerComponent,
    RouterLink,
    LocalizePipe,
    TranslatePipe,
  ],
  templateUrl: './portfolio-page.component.html',
  styleUrl: './portfolio-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPageComponent {
  /** Set by the category routes (route data -> input). */
  readonly category = input<PhotoCategory>();

  protected readonly categories = CATEGORIES;
  protected readonly current = computed(() => CATEGORIES.find((c) => c.id === this.category()));
  protected readonly image = computed(() => this.current()?.cover ?? BANNER_IMAGES.portfolio);
  protected readonly portfolio = { path: '/portfolio', label: 'nav.portfolio' };
}
