import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  booleanAttribute,
  input,
} from '@angular/core';

export type TitleSize = 'xl' | 'lg' | 'md' | 'sm';
export type TextSize = 'base' | 'lead' | 'small' | 'subtle';

/**
 * Titles (Train One). Words inside <em> are the gold handwritten highlight (Parisienne).
 *   <h2 app-title size="lg">Stories told in <em>light</em></h2>
 */
@Component({
  selector: 'h1[app-title], h2[app-title], h3[app-title], p[app-title], span[app-title]',
  template: '<ng-content />',
  styleUrl: './typography.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'title',
    '[class.title--xl]': "size() === 'xl'",
    '[class.title--lg]': "size() === 'lg'",
    '[class.title--md]': "size() === 'md'",
    '[class.title--sm]': "size() === 'sm'",
  },
})
export class TitleComponent {
  readonly size = input<TitleSize>('lg');
}

/** Small spaced-out gold label above a title. */
@Component({
  selector: 'p[app-eyebrow], span[app-eyebrow]',
  template: '<ng-content />',
  styleUrl: './typography.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'eyebrow', '[class.eyebrow--muted]': 'muted()' },
})
export class EyebrowComponent {
  readonly muted = input(false, { transform: booleanAttribute });
}

/** Body copy. */
@Component({
  selector: 'p[app-text], div[app-text], span[app-text]',
  template: '<ng-content />',
  styleUrl: './typography.component.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'text',
    '[class.text--lead]': "size() === 'lead'",
    '[class.text--small]': "size() === 'small'",
    '[class.text--subtle]': "size() === 'subtle'",
  },
})
export class TextComponent {
  readonly size = input<TextSize>('base');
}
