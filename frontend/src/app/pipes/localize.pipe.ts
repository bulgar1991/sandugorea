import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '@services/language.service';

/**
 * Public page link in the current language: `[routerLink]="'/booking' | localize"`
 * -> "/booking" (German) or "/en/booking". Impure so links follow a language switch.
 */
@Pipe({ name: 'localize', pure: false })
export class LocalizePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(path: string): string {
    return this.language.localize(path);
  }
}
