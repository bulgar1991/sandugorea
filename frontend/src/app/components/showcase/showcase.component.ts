import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { CountUpDirective } from '@directives/count-up.directive';
import { RevealDirective } from '@directives/reveal.directive';
import { CATEGORIES } from '@/data/portfolio.data';
import { EyebrowComponent, TitleComponent } from '@ui/typography/typography.component';
import { ContainerComponent } from '@ui/container/container.component';

/**
 * The "fancy" block: expanding image panels, one per category (hover / focus / tap opens one),
 * followed by numbers that count up when they scroll into view.
 */
@Component({
  selector: 'app-showcase',
  imports: [
    TitleComponent,
    EyebrowComponent,
    ContainerComponent,
    RouterLink,
    TranslatePipe,
    IconComponent,
    CountUpDirective,
    RevealDirective,
  ],
  templateUrl: './showcase.component.html',
  styleUrl: './showcase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseComponent {
  protected readonly categories = CATEGORIES;
  protected readonly active = signal(0);

  protected readonly stats = [
    { value: 12, suffix: '', key: 'showcase.stats.years' },
    { value: 480, suffix: '+', key: 'showcase.stats.sessions' },
    { value: 160, suffix: '', key: 'showcase.stats.weddings' },
    { value: 14, suffix: '', key: 'showcase.stats.countries' },
  ];
}
