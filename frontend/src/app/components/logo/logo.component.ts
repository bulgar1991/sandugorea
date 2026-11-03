import { LocalizePipe } from '@pipes/localize.pipe';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { BRAND } from '@/data/portfolio.data';

/**
 * Brand mark: "Sandu Gorea" in Arita Dotum with a gold line under it,
 * "Photography" (translated) centred below.
 */
@Component({
  selector: 'app-logo',
  imports: [LocalizePipe, RouterLink, TranslatePipe],
  template: `
    <a
      data-testid="logo-link-home"
      [routerLink]="'/' | localize"
      class="logo__link"
      [attr.aria-label]="'nav.home' | translate"
    >
      <span class="logo__name">{{ owner }}</span>
      <span class="logo__tagline">{{ 'brand.tagline' | translate }}</span>
    </a>
  `,
  styleUrl: './logo.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'logo', '[class.logo--lg]': "size() === 'lg'" },
})
export class LogoComponent {
  readonly size = input<'md' | 'lg'>('md');
  protected readonly owner = BRAND.owner;
}
