import { Routes, UrlSegment } from '@angular/router';
import { adminGuard, adminGuestGuard, customerGuard, customerGuestGuard } from '@guards/auth.guard';
import { languageGuard } from '@guards/language.guard';
import { PREFIXED_LANGUAGES } from '@services/language.service';
import { CATEGORY_IDS } from '@/data/portfolio.data';
import { seoResolver } from './resolvers/seo.resolver';

// `data.seo` holds translation keys (under "seo" in public/i18n/*.json); seoResolver turns them
// into the page title, description, canonical link and social-media tags.

/** Private pages must never show up in search engines. */
const NOINDEX = [{ name: 'robots', content: 'noindex, nofollow' }];

const mainLayoutRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    resolve: { seo: seoResolver },
    data: {
      seo: {
        title: 'seo.home.title',
        description: 'seo.home.description',
      },
    },
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./pages/about/about-page.component').then((m) => m.AboutPageComponent),
    resolve: { seo: seoResolver },
    data: { seo: { title: 'seo.about.title', description: 'seo.about.description' } },
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./pages/services/services-page.component').then((m) => m.ServicesPageComponent),
    resolve: { seo: seoResolver },
    data: { seo: { title: 'seo.services.title', description: 'seo.services.description' } },
  },
  {
    path: 'portfolio',
    loadComponent: () =>
      import('./pages/portfolio/portfolio-page.component').then((m) => m.PortfolioPageComponent),
    resolve: { seo: seoResolver },
    data: { seo: { title: 'seo.portfolio.title', description: 'seo.portfolio.description' } },
  },
  // One page per category: /portfolio/events, /portfolio/family, ... (unknown ones fall to 404).
  ...CATEGORY_IDS.map((category) => ({
    path: `portfolio/${category}`,
    loadComponent: () =>
      import('./pages/portfolio/portfolio-page.component').then((m) => m.PortfolioPageComponent),
    resolve: { seo: seoResolver },
    data: {
      category,
      seo: {
        title: 'seo.portfolio.categoryTitle',
        description: 'seo.portfolio.categoryDescription',
        params: {
          category: `categories.${category}.label`,
          blurb: `categories.${category}.blurb`,
        },
      },
    },
  })),
  {
    path: 'booking',
    loadComponent: () =>
      import('./pages/booking/booking-page.component').then((m) => m.BookingPageComponent),
    resolve: { seo: seoResolver },
    data: { seo: { title: 'seo.booking.title', description: 'seo.booking.description' } },
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
    resolve: { seo: seoResolver },
    data: {
      seo: {
        title: 'seo.notFound.title',
        description: 'seo.notFound.description',
        metaTags: [{ name: 'robots', content: 'noindex, follow' }],
      },
    },
  },
];

const customerRoutes: Routes = [
  {
    path: 'client/login',
    canMatch: [customerGuestGuard],
    loadComponent: () =>
      import('./pages/client/login/client-login.component').then((m) => m.ClientLoginComponent),
    resolve: { seo: seoResolver },
    data: { seo: { title: 'seo.clientLogin.title', metaTags: NOINDEX } },
  },
  {
    path: 'client',
    canMatch: [customerGuard],
    loadComponent: () =>
      import('./pages/client/layout/client-layout.component').then((m) => m.ClientLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/client/project/client-project.component').then(
            (m) => m.ClientProjectComponent,
          ),
        resolve: { seo: seoResolver },
        data: { seo: { title: 'seo.client.title', metaTags: NOINDEX } },
      },
    ],
  },
];

// Not linked anywhere on the site.
const adminRoutes: Routes = [
  {
    path: 'admin/login',
    canMatch: [adminGuestGuard],
    loadComponent: () =>
      import('./pages/admin/login/admin-login.component').then((m) => m.AdminLoginComponent),
    resolve: { seo: seoResolver },
    data: { seo: { title: 'seo.adminLogin.title', metaTags: NOINDEX } },
  },
  {
    path: 'admin',
    canMatch: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        resolve: { seo: seoResolver },
        data: { seo: { title: 'seo.admin.dashboard', metaTags: NOINDEX } },
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./pages/admin/projects/projects.component').then((m) => m.ProjectsComponent),
        resolve: { seo: seoResolver },
        data: { seo: { title: 'seo.admin.projects', metaTags: NOINDEX } },
      },
      {
        path: 'projects/:id',
        loadComponent: () =>
          import('./pages/admin/project-detail/project-detail.component').then(
            (m) => m.ProjectDetailComponent,
          ),
        resolve: { seo: seoResolver },
        data: { seo: { title: 'seo.admin.project', metaTags: NOINDEX } },
      },
      {
        path: 'security',
        loadComponent: () =>
          import('./pages/admin/security/security.component').then((m) => m.SecurityComponent),
        resolve: { seo: seoResolver },
        data: { seo: { title: 'seo.admin.security', metaTags: NOINDEX } },
      },
    ],
  },
];

const loadMainLayout = () =>
  import('@components/main-layout/main-layout.component').then((m) => m.MainLayoutComponent);

/** "/en/…", "/it/…", "/fr/…", "/ro/…": the first segment becomes the `lang` param. */
function languagePrefix(segments: UrlSegment[]) {
  const first = segments[0];
  return first && (PREFIXED_LANGUAGES as string[]).includes(first.path)
    ? { consumed: [first], posParams: { lang: first } }
    : null;
}

export const routes: Routes = [
  ...customerRoutes,
  ...adminRoutes,
  // German has no prefix: "/de/services" -> "/services".
  {
    matcher: (segments) => (segments[0]?.path === 'de' ? { consumed: segments } : null),
    redirectTo: ({ url }) =>
      '/' +
      url
        .slice(1)
        .map((s) => s.path)
        .join('/'),
  },
  {
    matcher: languagePrefix,
    canActivate: [languageGuard],
    loadComponent: loadMainLayout,
    children: mainLayoutRoutes,
  },
  {
    path: '',
    canActivate: [languageGuard],
    data: { lang: 'de' },
    loadComponent: loadMainLayout,
    children: mainLayoutRoutes,
  },
];
