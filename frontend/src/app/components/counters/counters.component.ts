import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { CountUpDirective } from '@directives/count-up.directive';
import { RevealDirective } from '@directives/reveal.directive';

/** Years / sessions / countries, counting up when they scroll into view. */
@Component({
  selector: 'app-counters',
  imports: [TranslatePipe, CountUpDirective, RevealDirective],
  template: `
    <div class="counters">
      @for (s of stats; track s.key; let i = $index) {
        <div class="counters__item" appReveal [revealDelay]="i * 100">
          <span class="counters__value" [appCountUp]="s.value" [suffix]="s.suffix"></span>
          <span class="counters__label">{{ s.key | translate }}</span>
        </div>
      }
    </div>
  `,
  styleUrl: './counters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountersComponent {
  protected readonly stats = [
    { value: 12, suffix: '', key: 'showcase.stats.years' },
    { value: 480, suffix: '+', key: 'showcase.stats.sessions' },
    { value: 14, suffix: '', key: 'showcase.stats.countries' },
  ];
}
