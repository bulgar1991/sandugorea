import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { LanguageSwitcherComponent } from '@components/language-switcher/language-switcher.component';
import { AuthError, AuthService } from '@services/auth.service';
import { BRAND, imageUrl } from '@/data/portfolio.data';
import { ButtonComponent } from '@ui/button/button.component';
import { LinkComponent } from '@ui/link/link.component';
import { TextComponent, TitleComponent } from '@ui/typography/typography.component';
import { FormFieldComponent, InputDirective } from '@ui/form-field/form-field.component';
import { AlertComponent } from '@ui/alert/alert.component';
import { SpinnerComponent } from '@ui/spinner/spinner.component';

interface ErrorMessage {
  key: string;
  params?: Record<string, unknown>;
}

@Component({
  selector: 'app-client-login',
  imports: [
    ButtonComponent,
    LinkComponent,
    TitleComponent,
    TextComponent,
    FormFieldComponent,
    InputDirective,
    AlertComponent,
    SpinnerComponent,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    IconComponent,
    LanguageSwitcherComponent,
  ],
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
  protected readonly error = signal<ErrorMessage | null>(null);

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
    this.error.set(null);
    try {
      const { username, password } = this.form.getRawValue();
      await this.auth.customerLogin(username, password);
      this.router.navigateByUrl('/client');
    } catch (e) {
      this.error.set(
        e instanceof AuthError
          ? { key: e.message, params: e.params }
          : { key: 'common.somethingWrong' },
      );
      this.form.controls.password.reset();
    } finally {
      this.loading.set(false);
    }
  }
}
