import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * Admin page heading: text on the left, actions on the right.
 *   <div app-page-head><div>…<h1 class="page-head__title">…</h1></div><button…/></div>
 */
@Component({
  selector: '[app-page-head]',
  template: '<ng-content />',
  styleUrl: './page-head.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page-head' },
})
export class PageHeadComponent {}
