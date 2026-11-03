import { LocalizePipe } from '@pipes/localize.pipe';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { CountersComponent } from '@components/counters/counters.component';
import { ButtonComponent } from '@ui/button/button.component';
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
    LocalizePipe,
    TitleComponent,
    EyebrowComponent,
    ContainerComponent,
    RouterLink,
    TranslatePipe,
    IconComponent,
    CountersComponent,
    ButtonComponent,
    RevealDirective,
  ],
  templateUrl: './showcase.component.html',
  styleUrl: './showcase.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseComponent {
  protected readonly categories = CATEGORIES;
  protected readonly active = signal(0);
}
