import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/** Centred page-width column with side padding.  <div app-container>…</div> */
@Component({
  selector: '[app-container]',
  template: '<ng-content />',
  styleUrl: './container.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'wrapper' },
})
export class ContainerComponent {}
