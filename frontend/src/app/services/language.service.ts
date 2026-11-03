import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

export type LanguageCode = 'en' | 'de' | 'it' | 'fr' | 'ro';

export interface Language {
  code: LanguageCode;
  label: string;
  name: string;
}

// Order matters: this is the order shown in the language switcher.
export const LANGUAGES: Language[] = [
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'it', label: 'IT', name: 'Italiano' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'ro', label: 'RO', name: 'Română' },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'de';

// Renamed from 'sg.lang': older builds saved the browser language automatically, which kept
// returning visitors on English. Only a language picked in the switcher is remembered now.
const STORAGE_KEY = 'sg.language';

/**
 * Public pages carry the language in the URL: German (the default) at the root, the others
 * under a prefix - /services, /en/services, /it/services… Private areas (/admin, /client) have
 * no prefix and use the visitor's last language.
 */
export const PREFIXED_LANGUAGES = LANGUAGES.map((l) => l.code).filter(
  (c) => c !== DEFAULT_LANGUAGE,
);

/** "/services" in `lang` -> "/en/services" ("/" -> "/en"). German paths stay as they are. */
export function localizePath(path: string, lang: LanguageCode): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (lang === DEFAULT_LANGUAGE) return clean;
  return clean === '/' ? `/${lang}` : `/${lang}${clean}`;
}

/** "/en/services?x=1#a" -> { lang: 'en', path: '/services', rest: '?x=1#a' }; unprefixed = German. */
export function splitLocalizedUrl(url: string): { lang: LanguageCode; path: string; rest: string } {
  const [, pathPart = '/', rest = ''] = /^([^?#]*)(.*)$/.exec(url) ?? [];
  const segments = pathPart.split('/').filter(Boolean);
  const first = segments[0] as LanguageCode | undefined;
  if (first && (PREFIXED_LANGUAGES as string[]).includes(first)) {
    return { lang: first, path: '/' + segments.slice(1).join('/'), rest };
  }
  return { lang: DEFAULT_LANGUAGE, path: '/' + segments.join('/'), rest };
}

/** /admin… and /client… are private: no language prefix, not indexed. */
export function isPrivatePath(path: string): boolean {
  return /^\/(admin|client)(\/|$)/.test(path);
}

/** Switches the site language (translations in public/i18n/*.json) and remembers the choice. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  readonly languages = LANGUAGES;
  readonly current = computed(
    () => (this.translate.currentLang() as LanguageCode | null) ?? DEFAULT_LANGUAGE,
  );

  /**
   * Called once on app start, before the first render (so no raw keys flash):
   * public pages take the language from the URL, private ones the saved choice (else German).
   */
  init(): Observable<unknown> {
    try {
      localStorage.removeItem('sg.lang');
    } catch {
      // Storage blocked: nothing to clean up.
    }
    const path = this.document.location?.pathname ?? '/';
    const lang = isPrivatePath(path)
      ? (this.savedLanguage() ?? DEFAULT_LANGUAGE)
      : splitLocalizedUrl(path).lang;
    return this.apply(lang);
  }

  /**
   * Language switcher: on a public page, open the same page in the other language
   * (the route's language guard then switches); on a private page, just switch.
   */
  switchTo(code: LanguageCode): void {
    const { path, rest } = splitLocalizedUrl(this.router.url);
    if (isPrivatePath(path)) {
      this.use(code).subscribe();
      return;
    }
    this.router.navigateByUrl(localizePath(path, code) + rest);
  }

  /** "/booking" -> the same page in the current language ("/en/booking"). */
  localize(path: string): string {
    return localizePath(path, this.current());
  }

  /** Switch and remember it (the private areas open in the last language used). */
  use(code: LanguageCode): Observable<unknown> {
    this.remember(code);
    return this.apply(code);
  }

  remember(code: LanguageCode): void {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Storage can be blocked (private mode); the language just won't be remembered.
    }
  }

  private apply(code: LanguageCode): Observable<unknown> {
    this.document.documentElement.lang = code;
    return this.translate.use(code);
  }

  private savedLanguage(): LanguageCode | null {
    try {
      return this.valid(localStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  valid(code: string | null | undefined): LanguageCode | null {
    return LANGUAGES.some((l) => l.code === code) ? (code as LanguageCode) : null;
  }
}
