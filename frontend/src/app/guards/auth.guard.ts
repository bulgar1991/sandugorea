import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '@services/auth.service';

export const adminGuard: CanMatchFn = () =>
  inject(AuthService).isAdmin() || inject(Router).parseUrl('/admin/login');

export const clientGuard: CanMatchFn = () =>
  inject(AuthService).isClient() || inject(Router).parseUrl('/client/login');

/** Keeps signed-in users away from the login screens. */
export const adminGuestGuard: CanMatchFn = () =>
  !inject(AuthService).isAdmin() || inject(Router).parseUrl('/admin');

export const clientGuestGuard: CanMatchFn = () =>
  !inject(AuthService).isClient() || inject(Router).parseUrl('/client');
