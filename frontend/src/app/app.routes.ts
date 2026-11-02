import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { adminGuard, adminGuestGuard, customerGuard, customerGuestGuard } from '@guards/auth.guard';
import { seoResolver } from './resolvers/seo.resolver';

// `data.seo` holds translation keys (under "seo" in public/i18n/*.json); seoResolver turns them
// into the page title, description, canonical link and social-media tags.

/** Private pages must never show up in search engines. */
const NOINDEX = [{ name: 'robots', content: 'noindex, nofollow' }];

/** Old multi-page URLs now live as sections of the one-page site. */
const toSection = (fragment: string) => () => inject(Router).createUrlTree(['/'], { fragment });

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
  { path: 'about', redirectTo: toSection('about') },
  { path: 'portfolio', redirectTo: toSection('works') },
  { path: 'contact', redirectTo: toSection('booking') },
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

export const routes: Routes = [
  ...customerRoutes,
  ...adminRoutes,
  {
    path: '',
    loadComponent: () =>
      import('@components/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: mainLayoutRoutes,
  },
];
