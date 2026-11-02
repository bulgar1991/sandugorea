import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '@services/auth.service';

/**
 * - Adds the header the API requires on every state-changing request (CSRF guard).
 * - When a private API answers 401 (session expired / signed out elsewhere), clears the
 *   session and sends the user to the right sign-in page.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const api = req.url.startsWith('/api/');

  const request = api ? req.clone({ setHeaders: { 'X-Requested-With': 'XMLHttpRequest' } }) : req;

  return next(request).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && !req.url.includes('/auth/')) {
        if (req.url.startsWith('/api/admin/')) {
          auth.clear();
          router.navigateByUrl('/admin/login');
        } else if (req.url.startsWith('/api/customer/')) {
          auth.clear();
          router.navigateByUrl('/client/login');
        }
      }
      return throwError(() => err);
    }),
  );
};
