import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { routes } from './app.routes';

/** URL path of the deepest matched route, without query params. */
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
      // Smooth crossfade between pages; skipped when only query params change (e.g. filters).
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          if (leafPath(from) === leafPath(to)) transition.skipTransition();
        },
      }),
    ),
    provideHttpClient(withFetch()),
  ],
};
