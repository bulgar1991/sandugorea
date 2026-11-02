import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/** Error message that shakes in.  <p app-alert role="alert">…</p> */
@Component({
  selector: '[app-alert]',
  template: '<ng-content />',
  styleUrl: './alert.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'alert' },
})
export class AlertComponent {}
