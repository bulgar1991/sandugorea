import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { LanguageSwitcherComponent } from '@components/language-switcher/language-switcher.component';
import { ToastsComponent } from '@components/toast/toast.component';
import { ToastService } from '@components/toast/toast.service';
import { AdminLoginStep, AuthError, AuthService } from '@services/auth.service';

type Step = 'credentials' | 'code' | 'recovery';

@Component({
  selector: 'app-admin-login',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    IconComponent,
    LanguageSwitcherComponent,
    ToastsComponent,
  ],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly step = signal<Step>('credentials');
  /** Set on first sign-in: QR code + secret to add to the authenticator app. */
  protected readonly enrollment = signal<AdminLoginStep | null>(null);
  protected readonly recoveryCodes = signal<string[]>([]);
  protected readonly useRecoveryCode = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<{ key: string; params?: Record<string, unknown> } | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly lockedUntil = signal(0);
  protected readonly now = signal(Date.now());
  protected readonly lockSeconds = computed(() =>
    Math.max(0, Math.ceil((this.lockedUntil() - this.now()) / 1000)),
  );

  protected readonly credentials = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });
  protected readonly code = this.fb.control('', [Validators.required, Validators.minLength(6)]);

  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const t = setInterval(() => this.now.set(Date.now()), 1000);
      destroyRef.onDestroy(() => clearInterval(t));
    });
  }

  protected async submitCredentials() {
    if (this.credentials.invalid || this.loading() || this.lockSeconds() > 0) {
      this.credentials.markAllAsTouched();
      return;
    }
    await this.run(
      async () => {
        const { username, password } = this.credentials.getRawValue();
        const result = await this.auth.adminLogin(username, password);
        this.enrollment.set(result.next === 'enroll' ? result : null);
        this.step.set('code');
        setTimeout(() => this.codeInput()?.nativeElement.focus(), 350);
      },
      () => this.credentials.controls.password.reset(),
    );
  }

  protected async submitCode() {
    if (this.code.invalid || this.loading()) return;
    await this.run(
      async () => {
        const codes = await this.auth.adminVerify(this.code.value.trim());
        if (codes?.length) {
          this.recoveryCodes.set(codes);
          this.step.set('recovery');
        } else {
          this.router.navigateByUrl('/admin');
        }
      },
      () => this.code.reset(),
    );
  }

  protected onCodeInput() {
    if (this.useRecoveryCode()) return;
    const digits = this.code.value.replace(/\D/g, '').slice(0, 6);
    if (digits !== this.code.value) this.code.setValue(digits);
    if (digits.length === 6) this.submitCode();
  }

  protected toggleRecovery() {
    this.useRecoveryCode.update((v) => !v);
    this.code.reset();
    this.error.set(null);
  }

  protected async copyCodes() {
    await navigator.clipboard.writeText(this.recoveryCodes().join('\n'));
    this.toast.show('common.copied', undefined, 'info', 2000);
  }

  protected finish() {
    this.router.navigateByUrl('/admin');
  }

  protected back() {
    this.step.set('credentials');
    this.enrollment.set(null);
    this.code.reset();
    this.error.set(null);
  }

  private async run(action: () => Promise<void>, onError: () => void) {
    this.loading.set(true);
    this.error.set(null);
    try {
      await action();
    } catch (e) {
      const err = e instanceof AuthError ? e : new AuthError('common.somethingWrong');
      this.error.set({ key: err.message, params: err.params });
      if (err.lockedUntil) this.lockedUntil.set(err.lockedUntil);
      if (err.message === 'auth.expired') this.back();
      onError();
    } finally {
      this.loading.set(false);
    }
  }
}
