import { LocalizePipe } from '@pipes/localize.pipe';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { PageLoaderState } from '@services/page-loader.service';
import { EyebrowComponent, TextComponent } from '@ui/typography/typography.component';

/**
 * Full-width banner at the top of inner pages: parallax photo (scroll timeline), title words
 * rising in, breadcrumb. Texts are translation keys.
 *   <app-page-banner image="…" eyebrow="pages.about.eyebrow" title="pages.about.title" />
 */
@Component({
  selector: 'app-page-banner',
  imports: [
    LocalizePipe,
    RouterLink,
    TranslatePipe,
    IconComponent,
    EyebrowComponent,
    TextComponent,
  ],
  templateUrl: './page-banner.component.html',
  styleUrl: './page-banner.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.page-banner--ready]': 'ready()' },
})
export class PageBannerComponent {
  readonly image = input.required<string>();
  readonly eyebrow = input('');
  /** Translation key; the words rise in one by one. */
  readonly title = input.required<string>();
  readonly subtitle = input('');
  /** Translation key of this page in the breadcrumb. */
  readonly crumb = input.required<string>();

  private readonly loader = inject(PageLoaderState);
  protected readonly ready = computed(() => !this.loader.visible());
}
