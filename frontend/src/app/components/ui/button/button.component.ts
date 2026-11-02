import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm' | 'icon';

/**
 * Button look for native <button> and <a> (so routerLink, type, disabled… keep working).
 *   <button app-button variant="outline" size="sm" type="submit">Save</button>
 *   <a app-button routerLink="/booking">Book</a>
 * Styles aren't encapsulated: projected icons/text sit inside the BEM block `.btn`.
 */
@Component({
  selector: 'button[app-button], a[app-button]',
  template: '<ng-content />',
  styleUrl: './button.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'btn',
    '[class.btn--primary]': "variant() === 'primary'",
    '[class.btn--outline]': "variant() === 'outline'",
    '[class.btn--ghost]': "variant() === 'ghost'",
    '[class.btn--danger]': "variant() === 'danger'",
    '[class.btn--sm]': "size() === 'sm'",
    '[class.btn--icon]': "size() === 'icon'",
    '[class.btn--block]': 'block()',
  },
})
export class ButtonComponent {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly block = input(false, { transform: booleanAttribute });
}
