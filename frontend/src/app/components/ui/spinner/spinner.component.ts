import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';

/** Small loading spinner, dark (for gold buttons) or light.  <app-spinner light /> */
@Component({
  selector: 'app-spinner',
  template: '',
  styleUrl: './spinner.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'spinner', '[class.spinner--light]': 'light()', 'aria-hidden': 'true' },
})
export class SpinnerComponent {
  readonly light = input(false, { transform: booleanAttribute });
}
