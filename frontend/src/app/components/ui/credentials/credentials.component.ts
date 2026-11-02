import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * Username / password shown once (new project, new password, recovery codes).
 * Parts: credentials__name · __warning · __box · __row · __key · __value · __copy · __actions
 */
@Component({
  selector: '[app-credentials]',
  template: '<ng-content />',
  styleUrl: './credentials.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'credentials' },
})
export class CredentialsComponent {}
