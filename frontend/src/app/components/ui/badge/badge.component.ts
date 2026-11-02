import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

export type BadgeTone = 'success' | 'accent' | 'danger' | 'muted' | string;

/** Small status pill.  <app-badge tone="success">Delivered</app-badge> */
@Component({
  selector: 'app-badge',
  template: '<ng-content />',
  styleUrl: './badge.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': "'badge badge--' + tone()" },
})
export class BadgeComponent {
  readonly tone = input<BadgeTone>('muted');
}
