import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session } from '@models/client.models';
import { GalleryStore } from './gallery-store.service';

const STORAGE_KEY = 'sg.session';
const MAX_ADMIN_ATTEMPTS = 5;
const LOCKOUT_MS = 60_000;
/** Admin is logged out after this long without activity. */
export const ADMIN_IDLE_TIMEOUT_MS = 15 * 60_000;

export class AuthError extends Error {
  constructor(
    message: string,
    readonly lockedUntil?: number,
  ) {
    super(message);
  }
}

/**
 * UI-only MOCK of authentication so the screens can be built before the API exists.
 *
 * The real implementation (next step, in .NET) will use:
 *  - HttpOnly + Secure + SameSite=Strict session cookies (never tokens in JS storage)
 *  - Argon2/PBKDF2 password hashing, server-side rate limiting and lockout
 *  - TOTP two-factor authentication for the admin
 *  - every photo served through an authorised endpoint, never as a public file
 *
 * Mock credentials — admin: admin / admin123, code 123456 · client: ana.mihai / demo1234
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly store = inject(GalleryStore);
  private readonly router = inject(Router);

  private readonly _session = signal<Session | null>(readSession());
  private pendingAdmin: string | null = null;
  private failedAdminAttempts = 0;
  private lockedUntil = 0;

  readonly session = this._session.asReadonly();
  readonly isAdmin = computed(() => this._session()?.role === 'admin');
  readonly isClient = computed(() => this._session()?.role === 'client');

  /** Step 1 of admin sign-in. Resolves when a 2FA code is required. */
  async adminLogin(username: string, password: string): Promise<void> {
    await delay(700);
    if (Date.now() < this.lockedUntil) {
      throw new AuthError('Too many attempts. Try again later.', this.lockedUntil);
    }
    if (username !== 'admin' || password !== 'admin123') {
      this.failedAdminAttempts++;
      if (this.failedAdminAttempts >= MAX_ADMIN_ATTEMPTS) {
        this.failedAdminAttempts = 0;
        this.lockedUntil = Date.now() + LOCKOUT_MS;
        throw new AuthError('Too many attempts. Try again later.', this.lockedUntil);
      }
      // Same message for unknown user and wrong password - don't leak which one was wrong.
      throw new AuthError(
        `Invalid credentials. ${MAX_ADMIN_ATTEMPTS - this.failedAdminAttempts} attempts left.`,
      );
    }
    this.pendingAdmin = username;
  }

  /** Step 2 of admin sign-in: the 6-digit code from the authenticator app. */
  async adminVerify(code: string): Promise<void> {
    await delay(600);
    if (!this.pendingAdmin) throw new AuthError('Session expired. Sign in again.');
    if (code !== '123456') throw new AuthError('Invalid code.');
    this.failedAdminAttempts = 0;
    this.setSession({ role: 'admin', username: this.pendingAdmin, displayName: 'Administrator' });
    this.pendingAdmin = null;
  }

  async clientLogin(username: string, password: string): Promise<void> {
    await delay(700);
    const client = this.store.verifyClient(username.trim().toLowerCase(), password);
    if (!client) throw new AuthError('Incorrect username or password.');
    this.setSession({
      role: 'client',
      username: client.username,
      displayName: client.name,
      clientId: client.id,
    });
  }

  logout(redirectTo?: string) {
    const role = this._session()?.role;
    this.setSession(null);
    this.router.navigateByUrl(redirectTo ?? (role === 'admin' ? '/admin/login' : '/client/login'));
  }

  private setSession(session: Session | null) {
    this._session.set(session);
    try {
      if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable - session stays in memory */
    }
  }
}

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
