import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Session } from '@models/project.models';

/** Admin idle sign-out (matches the server's sliding cookie lifetime). */
export const ADMIN_IDLE_TIMEOUT_MS = 15 * 60_000;

/** `message` is a translation key; `params` fill its {{placeholders}}. */
export class AuthError extends Error {
  constructor(
    message: string,
    readonly params?: Record<string, unknown>,
    readonly lockedUntil?: number,
  ) {
    super(message);
  }
}

export interface AdminLoginStep {
  /** "totp" = enter the code; "enroll" = scan the QR code first (first sign-in). */
  next: 'totp' | 'enroll';
  secret?: string;
  otpAuthUri?: string;
  qrPng?: string;
}

/**
 * Sign-in for the admin (password + authenticator code) and customers (project credentials).
 * Sessions live in HttpOnly cookies set by the API - nothing secret is ever stored in JS.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _session = signal<Session | null>(null);
  readonly session = this._session.asReadonly();
  readonly isAdmin = computed(() => this._session()?.role === 'admin');
  readonly isCustomer = computed(() => this._session()?.role === 'customer');

  /** Asks the API whether the admin cookie is still valid (used by route guards). */
  async checkAdmin(): Promise<boolean> {
    if (this.isAdmin()) return true;
    try {
      const me = await firstValueFrom(this.http.get<{ username: string }>('/api/admin/auth/me'));
      this._session.set({ role: 'admin', displayName: me.username });
      return true;
    } catch {
      return false;
    }
  }

  async checkCustomer(): Promise<boolean> {
    if (this.isCustomer()) return true;
    try {
      const me = await firstValueFrom(this.http.get<{ name: string }>('/api/customer/auth/me'));
      this._session.set({ role: 'customer', displayName: me.name });
      return true;
    } catch {
      return false;
    }
  }

  /** Step 1 of admin sign-in. */
  async adminLogin(username: string, password: string): Promise<AdminLoginStep> {
    try {
      return await firstValueFrom(
        this.http.post<AdminLoginStep>('/api/admin/auth/login', { username, password }),
      );
    } catch (e) {
      throw toAuthError(e, 'auth.invalidAdmin');
    }
  }

  /** Step 2: authenticator code (or a recovery code). Returns recovery codes after enrolment. */
  async adminVerify(code: string): Promise<string[] | null> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ username: string; recoveryCodes: string[] | null }>(
          '/api/admin/auth/verify',
          { code },
        ),
      );
      this._session.set({ role: 'admin', displayName: res.username });
      return res.recoveryCodes;
    } catch (e) {
      throw toAuthError(e, 'auth.invalidCode');
    }
  }

  async customerLogin(username: string, password: string): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ name: string }>('/api/customer/auth/login', { username, password }),
      );
      this._session.set({ role: 'customer', displayName: res.name });
    } catch (e) {
      throw toAuthError(e, 'auth.invalidCustomer');
    }
  }

  async logout(redirectTo?: string) {
    const role = this._session()?.role;
    const url = role === 'admin' ? '/api/admin/auth/logout' : '/api/customer/auth/logout';
    try {
      await firstValueFrom(this.http.post(url, null));
    } catch {
      // Signed out locally either way.
    }
    this.clear();
    this.router.navigateByUrl(redirectTo ?? (role === 'admin' ? '/admin/login' : '/client/login'));
  }

  /** Forget the session locally (e.g. the server answered 401). */
  clear() {
    this._session.set(null);
  }
}

function toAuthError(e: unknown, invalidKey: string): AuthError {
  if (e instanceof HttpErrorResponse) {
    const error = (e.error as { error?: string; retryAfterSeconds?: number } | null) ?? {};
    if (e.status === 423) {
      return new AuthError(
        'auth.locked',
        undefined,
        Date.now() + (error.retryAfterSeconds ?? 60) * 1000,
      );
    }
    if (e.status === 429) return new AuthError('auth.tooMany');
    if (error.error === 'expired') return new AuthError('auth.expired');
    if (e.status === 401 || e.status === 400) return new AuthError(invalidKey);
  }
  return new AuthError('common.somethingWrong');
}
