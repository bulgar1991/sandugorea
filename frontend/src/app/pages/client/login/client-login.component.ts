import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { AuthError, AuthService } from '@services/auth.service';
import { BRAND, imageUrl } from '@/data/portfolio.data';

@Component({
  selector: 'app-client-login',
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  templateUrl: './client-login.component.html',
  styleUrl: './client-login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientLoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly brand = BRAND;
  protected readonly image = imageUrl('sg-client-login', 1400, 1800);
  protected readonly showPassword = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  protected readonly form = inject(NonNullableFormBuilder).group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  protected async submit() {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      const { username, password } = this.form.getRawValue();
      await this.auth.clientLogin(username, password);
      this.router.navigateByUrl('/client');
    } catch (e) {
      this.error.set(
        e instanceof AuthError ? e.message : 'Something went wrong. Please try again.',
      );
      this.form.controls.password.reset();
    } finally {
      this.loading.set(false);
    }
  }
}
