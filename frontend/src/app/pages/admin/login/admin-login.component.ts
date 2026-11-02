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
import { Meta } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { AuthError, AuthService } from '@services/auth.service';

@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly step = signal<'credentials' | 'code'>('credentials');
  protected readonly loading = signal(false);
  protected readonly error = signal('');
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
  protected readonly code = this.fb.control('', [
    Validators.required,
    Validators.pattern(/^\d{6}$/),
  ]);

  private readonly codeInput = viewChild<ElementRef<HTMLInputElement>>('codeInput');

  constructor() {
    inject(Meta).updateTag({ name: 'robots', content: 'noindex, nofollow' });
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
        await this.auth.adminLogin(username, password);
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
        await this.auth.adminVerify(this.code.value);
        this.router.navigateByUrl('/admin');
      },
      () => this.code.reset(),
    );
  }

  protected onCodeInput() {
    const digits = this.code.value.replace(/\D/g, '').slice(0, 6);
    if (digits !== this.code.value) this.code.setValue(digits);
    if (digits.length === 6) this.submitCode();
  }

  protected back() {
    this.step.set('credentials');
    this.code.reset();
    this.error.set('');
  }

  private async run(action: () => Promise<void>, onError: () => void) {
    this.loading.set(true);
    this.error.set('');
    try {
      await action();
    } catch (e) {
      const err = e instanceof AuthError ? e : new AuthError('Something went wrong.');
      this.error.set(err.message);
      if (err.lockedUntil) this.lockedUntil.set(err.lockedUntil);
      onError();
    } finally {
      this.loading.set(false);
    }
  }
}
