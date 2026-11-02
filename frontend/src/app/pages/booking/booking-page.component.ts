import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BookingComponent } from '@components/booking/booking.component';
import { PageBannerComponent } from '@components/page-banner/page-banner.component';
import { SocialLinksComponent } from '@components/social-links/social-links.component';
import { BANNER_IMAGES } from '@/data/portfolio.data';

@Component({
  selector: 'app-booking-page',
  imports: [PageBannerComponent, BookingComponent, SocialLinksComponent],
  template: `
    <app-page-banner
      [image]="image"
      eyebrow="pages.booking.eyebrow"
      title="pages.booking.title"
      subtitle="pages.booking.subtitle"
      crumb="nav.booking"
    />
    <app-booking [presetType]="type()" />
    <app-social-links />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingPageComponent {
  /** ?type=weddings preselects the session type (from the Services page). */
  readonly type = input<string>();
  protected readonly image = BANNER_IMAGES.booking;
}
