import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { RevealDirective } from '@directives/reveal.directive';
import {
  EyebrowComponent,
  TextComponent,
  TitleComponent,
} from '@ui/typography/typography.component';
import { BRAND, SOCIAL_LINKS } from '@/data/portfolio.data';

/**
 * Social profiles.
 *   variant="block"  - section with title and large animated tiles (pages)
 *   variant="inline" - a row of round icons (footer)
 */
@Component({
  selector: 'app-social-links',
  imports: [
    TranslatePipe,
    IconComponent,
    RevealDirective,
    EyebrowComponent,
    TextComponent,
    TitleComponent,
  ],
  templateUrl: './social-links.component.html',
  styleUrl: './social-links.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialLinksComponent {
  readonly variant = input<'block' | 'inline'>('block');
  protected readonly links = [
    ...SOCIAL_LINKS,
    { id: 'envelope' as const, label: 'E-Mail', url: `mailto:${BRAND.email}` },
  ];
}
