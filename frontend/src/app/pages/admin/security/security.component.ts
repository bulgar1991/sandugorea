import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { ModalComponent } from '@components/modal/modal.component';
import { ToastService } from '@components/toast/toast.service';
import { RevealDirective } from '@directives/reveal.directive';
import { AdminSessionInfo, LoginEventInfo } from '@models/project.models';
import { LocalDatePipe } from '@pipes/local-date.pipe';
import { ProjectsApi } from '@services/projects-api.service';

@Component({
  selector: 'app-security',
  imports: [
    ReactiveFormsModule,
    LocalDatePipe,
    TranslatePipe,
    IconComponent,
    ModalComponent,
    RevealDirective,
  ],
  templateUrl: './security.component.html',
  styleUrl: './security.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityComponent {
  private readonly api = inject(ProjectsApi);
  private readonly toast = inject(ToastService);

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      current: ['', Validators.required],
      next: ['', [Validators.required, Validators.minLength(12)]],
      confirm: ['', Validators.required],
    },
    {
      validators: (g: AbstractControl): ValidationErrors | null =>
        g.value.next === g.value.confirm ? null : { mismatch: true },
    },
  );
  protected readonly saving = signal(false);
  protected readonly passwordError = signal<string | null>(null);

  private readonly nextValue = toSignal(this.form.controls.next.valueChanges, { initialValue: '' });

  /** 0–4 rough strength score (the server enforces the real rule). */
  protected readonly strength = computed(() => {
    const p = this.nextValue();
    let s = 0;
    if (p.length >= 12) s++;
    if (p.length >= 16) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
    return s;
  });
  protected readonly strengthLabel = computed(() => `admin.security.strength.s${this.strength()}`);

  protected readonly rules = ['r1', 'r2', 'r3'].map((r) => `admin.security.rules.${r}`);
  protected readonly totpEnabled = signal(true);
  protected readonly codesLeft = signal<number | null>(null);
  protected readonly sessions = signal<AdminSessionInfo[]>([]);
  protected readonly history = signal<LoginEventInfo[]>([]);
  protected readonly newCodes = signal<string[] | null>(null);

  constructor() {
    this.load();
  }

  private async load() {
    const [security, sessions, history] = await Promise.all([
      this.api.security(),
      this.api.sessions(),
      this.api.history(),
    ]);
    this.totpEnabled.set(security.totpEnabled);
    this.codesLeft.set(security.recoveryCodesLeft);
    this.sessions.set(sessions);
    this.history.set(history);
  }

  protected async changePassword() {
    if (this.form.invalid || this.strength() < 3 || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.passwordError.set(null);
    try {
      const { current, next } = this.form.getRawValue();
      await this.api.changePassword(current, next);
      this.form.reset();
      this.toast.show('admin.toasts.passwordUpdated');
      this.sessions.set(await this.api.sessions());
    } catch (e) {
      const code = e instanceof HttpErrorResponse ? e.error?.error : null;
      this.passwordError.set(
        code === 'invalidCurrent'
          ? 'admin.security.invalidCurrent'
          : code === 'weak'
            ? 'admin.security.weak'
            : 'common.somethingWrong',
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected async regenerateCodes() {
    const { codes } = await this.api.regenerateRecoveryCodes();
    this.newCodes.set(codes);
    this.codesLeft.set(codes.length);
    this.toast.show('admin.toasts.codesRegenerated', undefined, 'info');
  }

  protected async copyCodes() {
    await navigator.clipboard.writeText((this.newCodes() ?? []).join('\n'));
    this.toast.show('common.copied', undefined, 'info', 2000);
  }

  protected async revokeOthers() {
    await this.api.revokeOtherSessions();
    this.sessions.update((s) => s.filter((x) => x.current));
    this.toast.show('admin.toasts.sessionsRevoked', undefined, 'info');
  }
}
