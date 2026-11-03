import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { DEFAULT_LANGUAGE, LanguageCode, LanguageService } from '@services/language.service';

/**
 * Public pages: the URL decides the language ("/en/…" = English, no prefix = German).
 * Runs before the SEO resolver, so titles and tags come out in the right language.
 */
export const languageGuard: CanActivateFn = (route) => {
  const language = inject(LanguageService);
  const lang: LanguageCode =
    language.valid(route.params['lang']) ??
    (route.data['lang'] as LanguageCode) ??
    DEFAULT_LANGUAGE;
  if (language.current() === lang) {
    language.remember(lang);
    return true;
  }
  return language.use(lang).pipe(map(() => true));
};
