import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';

/** Dark rounded surface.  <div app-card padded hover>…</div> */
@Component({
  selector: '[app-card]',
  template: '<ng-content />',
  styleUrl: './card.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card', '[class.card--padded]': 'padded()', '[class.card--hover]': 'hover()' },
})
export class CardComponent {
  readonly padded = input(false, { transform: booleanAttribute });
  /** Gold border on hover. */
  readonly hover = input(false, { transform: booleanAttribute });
}
