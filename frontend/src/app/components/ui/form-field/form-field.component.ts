import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';

/**
 * A form field: label, control, hint/error. Owns ALL form-control styles.
 *   <label app-field>
 *     <span class="field__label">Email</span>
 *     <input app-input boxed formControlName="email" />
 *     <small class="field__error">…</small>
 *   </label>
 * Parts: field__label · field__wrap (control + button) · field__toggle (show password) ·
 * field__error · field__hint.
 */
@Component({
  selector: 'label[app-field], div[app-field]',
  template: '<ng-content />',
  styleUrl: './form-field.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'field' },
})
export class FormFieldComponent {}

/**
 * Styles a native input / textarea / select as a field control (styles live in FormFieldComponent,
 * so use it inside an `app-field`).
 *   boxed - framed instead of underlined · mono - monospace · code - big spaced digits · date - dark picker
 */
@Directive({
  selector: 'input[app-input], textarea[app-input], select[app-input]',
  host: {
    class: 'field__control',
    '[class.field__control--boxed]': 'boxed()',
    '[class.field__control--mono]': 'mono()',
    '[class.field__control--code]': 'code()',
    '[class.field__control--date]': 'date()',
  },
})
export class InputDirective {
  readonly boxed = input(false, { transform: booleanAttribute });
  readonly mono = input(false, { transform: booleanAttribute });
  readonly code = input(false, { transform: booleanAttribute });
  readonly date = input(false, { transform: booleanAttribute });
}
