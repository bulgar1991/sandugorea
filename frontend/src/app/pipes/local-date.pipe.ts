import { formatDate } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { LanguageService } from '@services/language.service';

/**
 * Like the `date` pipe, but formats in the current site language
 * (month names etc. switch with the language).
 *   {{ project.date | localDate: 'd MMMM y' }}
 */
@Pipe({ name: 'localDate', pure: false })
export class LocalDatePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(value: string | number | Date | null | undefined, format = 'mediumDate'): string {
    if (value === null || value === undefined || value === '') return '';
    return formatDate(value, format, this.language.current());
  }
}
