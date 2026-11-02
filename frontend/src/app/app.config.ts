import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeFr from '@angular/common/locales/fr';
import localeIt from '@angular/common/locales/it';
import localeRo from '@angular/common/locales/ro';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { DEFAULT_LANGUAGE, LanguageService } from '@services/language.service';
import { apiInterceptor } from './interceptors/api.interceptor';
import { routes } from './app.routes';

// Month/day names for the localDate pipe (English is built in).
[localeDe, localeFr, localeIt, localeRo].forEach((l) => registerLocaleData(l));

/** URL path of the deepest matched route, without query params or fragment. */
function leafPath(snapshot: ActivatedRouteSnapshot): string {
  let s = snapshot;
  while (s.firstChild) s = s.firstChild;
  return s.pathFromRoot.flatMap((r) => r.url.map((u) => u.path)).join('/');
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
      // Route params, query params and resolved data are bound to component inputs.
      withComponentInputBinding(),
      // Smooth crossfade between pages; skipped when only query params / #anchor change.
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          if (leafPath(from) === leafPath(to)) transition.skipTransition();
        },
      }),
    ),
    // XHR (not fetch) so photo uploads can report progress.
    provideHttpClient(withInterceptors([apiInterceptor])),
    provideTranslateService({
      loader: provideTranslateHttpLoader({ prefix: 'i18n/', suffix: '.json' }),
      fallbackLang: DEFAULT_LANGUAGE,
    }),
    // Load the saved (or browser) language before the first render, so no raw keys flash.
    provideAppInitializer(() => inject(LanguageService).init()),
  ],
};
