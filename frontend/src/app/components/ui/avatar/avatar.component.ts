import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

/** Round initial / icon.  <span app-avatar size="lg">A</span> */
@Component({
  selector: '[app-avatar]',
  template: '<ng-content />',
  styleUrl: './avatar.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'avatar', '[class.avatar--lg]': "size() === 'lg'" },
})
export class AvatarComponent {
  readonly size = input<'md' | 'lg'>('md');
}
