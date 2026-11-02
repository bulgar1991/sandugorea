import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';

export const adminGuard: CanMatchFn = () =>
  inject(AuthService).isAdmin() || inject(Router).parseUrl('/admin/login');

export const customerGuard: CanMatchFn = () =>
  inject(AuthService).isCustomer() || inject(Router).parseUrl('/client/login');

/** Keeps signed-in users away from the login screens. */
export const adminGuestGuard: CanMatchFn = () =>
  !inject(AuthService).isAdmin() || inject(Router).parseUrl('/admin');

export const customerGuestGuard: CanMatchFn = () =>
  !inject(AuthService).isCustomer() || inject(Router).parseUrl('/client');
