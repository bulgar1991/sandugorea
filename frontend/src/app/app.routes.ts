import { Routes } from '@angular/router';
import { SiteLayoutComponent } from '@components/site-layout/site-layout.component';
import { adminGuard, adminGuestGuard, customerGuard, customerGuestGuard } from '@guards/auth.guard';

export const routes: Routes = [
  // ---------- Public site ----------
  {
    path: '',
    component: SiteLayoutComponent,
    children: [
      {
        path: '',
        title: 'Sandugorea — Photography',
        loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'portfolio',
        title: 'Portfolio — Sandugorea',
        loadComponent: () =>
          import('./pages/portfolio/portfolio.component').then((m) => m.PortfolioComponent),
      },
      {
        path: 'about',
        title: 'About — Sandugorea',
        loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
      },
      {
        path: 'contact',
        title: 'Contact — Sandugorea',
        loadComponent: () =>
          import('./pages/contact/contact.component').then((m) => m.ContactComponent),
      },
    ],
  },

  // ---------- Customer private project ----------
  {
    path: 'client/login',
    title: 'Your project — Sandugorea',
    canMatch: [customerGuestGuard],
    loadComponent: () =>
      import('./pages/client/login/client-login.component').then((m) => m.ClientLoginComponent),
  },
  {
    path: 'client',
    canMatch: [customerGuard],
    loadComponent: () =>
      import('./pages/client/layout/client-layout.component').then((m) => m.ClientLayoutComponent),
    children: [
      {
        path: '',
        title: 'Your photos — Sandugorea',
        loadComponent: () =>
          import('./pages/client/project/client-project.component').then(
            (m) => m.ClientProjectComponent,
          ),
      },
    ],
  },

  // ---------- Admin (not linked anywhere on the site) ----------
  {
    path: 'admin/login',
    title: 'Sign in',
    canMatch: [adminGuestGuard],
    loadComponent: () =>
      import('./pages/admin/login/admin-login.component').then((m) => m.AdminLoginComponent),
  },
  {
    path: 'admin',
    canMatch: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    children: [
      {
        path: '',
        title: 'Dashboard · Admin',
        loadComponent: () =>
          import('./pages/admin/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'projects',
        title: 'Projects · Admin',
        loadComponent: () =>
          import('./pages/admin/projects/projects.component').then((m) => m.ProjectsComponent),
      },
      {
        path: 'projects/:id',
        title: 'Project · Admin',
        loadComponent: () =>
          import('./pages/admin/project-detail/project-detail.component').then(
            (m) => m.ProjectDetailComponent,
          ),
      },
      {
        path: 'security',
        title: 'Security · Admin',
        loadComponent: () =>
          import('./pages/admin/security/security.component').then((m) => m.SecurityComponent),
      },
    ],
  },

  // ---------- 404 ----------
  {
    path: '**',
    component: SiteLayoutComponent,
    children: [
      {
        path: '',
        title: 'Not found — Sandugorea',
        loadComponent: () =>
          import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  },
];
