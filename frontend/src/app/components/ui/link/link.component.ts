import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';

/**
 * Text link look for <a> (routerLink / href keep working).
 *   <a app-link routerLink="/about" caps underline>More</a>
 *   <a app-link variant="muted" [active]="isCurrent">Home</a>
 */
@Component({
  selector: 'a[app-link]',
  template: '<ng-content />',
  styleUrl: './link.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'link',
    '[class.link--muted]': "variant() === 'muted'",
    '[class.link--caps]': 'caps()',
    '[class.link--underline]': 'underline()',
    '[class.link--active]': 'active()',
  },
})
export class LinkComponent {
  readonly variant = input<'accent' | 'muted'>('accent');
  /** Small uppercase label style (with room for an icon). */
  readonly caps = input(false, { transform: booleanAttribute });
  /** Line that draws in from the left on hover. */
  readonly underline = input(false, { transform: booleanAttribute });
  /** Keeps the underline drawn (current page). */
  readonly active = input(false, { transform: booleanAttribute });
}
