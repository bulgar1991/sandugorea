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
import { LocalDatePipe } from '@pipes/local-date.pipe';
import { ToastService } from '@components/toast/toast.service';
import { RevealDirective } from '@directives/reveal.directive';

@Component({
  selector: 'app-security',
  imports: [ReactiveFormsModule, LocalDatePipe, TranslatePipe, IconComponent, RevealDirective],
  templateUrl: './security.component.html',
  styleUrl: './security.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityComponent {
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

  private readonly nextValue = toSignal(this.form.controls.next.valueChanges, { initialValue: '' });

  /** 0–4 rough strength score. */
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

  protected readonly sessions = signal([
    {
      id: 1,
      device: 'Chrome on macOS',
      ip: '86.120.x.x',
      location: 'Bucharest, RO',
      lastSeen: new Date().toISOString(),
      current: true,
    },
    {
      id: 2,
      device: 'Safari on iPhone',
      ip: '5.12.x.x',
      location: 'Bucharest, RO',
      lastSeen: '2026-11-01T21:14:00Z',
      current: false,
    },
  ]);

  protected readonly history = [
    { time: '2026-11-02T09:12:00Z', ip: '86.120.x.x', location: 'Bucharest, RO', ok: true },
    { time: '2026-11-01T21:14:00Z', ip: '5.12.x.x', location: 'Bucharest, RO', ok: true },
    { time: '2026-10-31T03:47:00Z', ip: '185.220.x.x', location: 'Unknown', ok: false },
    { time: '2026-10-30T18:02:00Z', ip: '86.120.x.x', location: 'Bucharest, RO', ok: true },
  ];

  protected changePassword() {
    if (this.form.invalid || this.strength() < 3) {
      this.form.markAllAsTouched();
      return;
    }
    // TODO: POST /api/admin/account/password
    this.form.reset();
    this.toast.show('admin.toasts.passwordUpdated');
  }

  protected regenerateCodes() {
    // TODO: POST /api/admin/account/recovery-codes
    this.toast.show('admin.toasts.codesRegenerated', undefined, 'info');
  }

  protected revokeOthers() {
    this.sessions.update((s) => s.filter((x) => x.current));
    this.toast.show('admin.toasts.sessionsRevoked', undefined, 'info');
  }
}
