import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject } from '@angular/core';
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

/** Switches the site language (translations in public/i18n/*.json) and remembers the choice. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  readonly languages = LANGUAGES;
  readonly current = computed(
    () => (this.translate.currentLang() as LanguageCode | null) ?? DEFAULT_LANGUAGE,
  );

  /** Called once on app start, before the first render: the visitor's saved choice, else German. */
  init(): Observable<unknown> {
    try {
      localStorage.removeItem('sg.lang');
    } catch {
      // Storage blocked: nothing to clean up.
    }
    return this.apply(this.savedLanguage() ?? DEFAULT_LANGUAGE);
  }

  /** The visitor picked a language: switch and remember it. */
  use(code: LanguageCode): Observable<unknown> {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // Storage can be blocked (private mode); the language just won't be remembered.
    }
    return this.apply(code);
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

  private valid(code: string | null | undefined): LanguageCode | null {
    return LANGUAGES.some((l) => l.code === code) ? (code as LanguageCode) : null;
  }
}
