import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageCode, LanguageService } from '@services/language.service';

/**
 * Language picker.
 *   variant="dropdown" (default) - compact button with a menu (header, sidebars)
 *   variant="inline"             - all codes in a row (mobile menu, footer)
 */
@Component({
  selector: 'app-language-switcher',
  imports: [TranslatePipe],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'open.set(false)',
  },
})
export class LanguageSwitcherComponent {
  readonly variant = input<'dropdown' | 'inline'>('dropdown');
  /** Opens the menu upwards (e.g. at the bottom of a sidebar). */
  readonly up = input(false);

  protected readonly language = inject(LanguageService);
  protected readonly open = signal(false);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected select(code: LanguageCode) {
    this.language.switchTo(code);
    this.open.set(false);
  }

  protected onDocumentClick(e: MouseEvent) {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }
}
