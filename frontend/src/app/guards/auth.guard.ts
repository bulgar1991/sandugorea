import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';

// Guards only decide what to *show*. Every API call is authorised by the server itself.

export const adminGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await auth.checkAdmin()) || router.parseUrl('/admin/login');
};

export const customerGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await auth.checkCustomer()) || router.parseUrl('/client/login');
};

/** Keeps signed-in users away from the login screens. */
export const adminGuestGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return !(await auth.checkAdmin()) || router.parseUrl('/admin');
};

export const customerGuestGuard: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return !(await auth.checkCustomer()) || router.parseUrl('/client');
};
