import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent, IconName } from '@components/icon/icon.component';
import { RevealDirective } from '@directives/reveal.directive';
import { LanguageService } from '@services/language.service';
import { StudioMapComponent } from '@components/studio-map/studio-map.component';
import { DatePickerComponent } from '@components/date-picker/date-picker.component';
import { BRAND, CATEGORY_IDS } from '@/data/portfolio.data';
import { ButtonComponent } from '@ui/button/button.component';
import { TextComponent, TitleComponent } from '@ui/typography/typography.component';
import { FormFieldComponent, InputDirective } from '@ui/form-field/form-field.component';
import { AlertComponent } from '@ui/alert/alert.component';
import { SpinnerComponent } from '@ui/spinner/spinner.component';
import { ContainerComponent } from '@ui/container/container.component';

/** Booking request form + contact details. */
@Component({
  selector: 'app-booking',
  imports: [
    DatePickerComponent,
    StudioMapComponent,
    ButtonComponent,
    TextComponent,
    TitleComponent,
    FormFieldComponent,
    InputDirective,
    AlertComponent,
    SpinnerComponent,
    ContainerComponent,
    ReactiveFormsModule,
    TranslatePipe,
    IconComponent,
    RevealDirective,
  ],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingComponent {
  /** Session type to preselect (e.g. from a service's "Book this session" button). */
  readonly presetType = input<string | undefined>(undefined);

  protected readonly types = [...CATEGORY_IDS, 'other'];
  private readonly http = inject(HttpClient);
  private readonly language = inject(LanguageService);
  protected readonly state = signal<'idle' | 'sending' | 'sent' | 'error'>('idle');

  protected readonly contacts: { icon: IconName; value: string; href: string }[] = [
    { icon: 'mail', value: BRAND.email, href: `mailto:${BRAND.email}` },
    { icon: 'phone', value: BRAND.phone, href: `tel:${BRAND.phone.replace(/\s/g, '')}` },
    { icon: 'instagram', value: '@sandugorea', href: BRAND.instagram },
  ];

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.maxLength(30)],
    type: [CATEGORY_IDS[0] as string],
    date: ['', Validators.required],
    location: ['', Validators.maxLength(120)],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(4000)]],
    consent: [false, Validators.requiredTrue],
    /** Honeypot: hidden from people, filled by bots. */
    website: [''],
  });

  protected invalid(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.state.set('sending');
    try {
      await firstValueFrom(
        this.http.post('/api/booking', {
          ...this.form.getRawValue(),
          language: this.language.current(),
        }),
      );
      this.state.set('sent');
      this.form.reset();
    } catch {
      this.state.set('error');
    }
  }

  constructor() {
    effect(() => {
      const type = this.presetType();
      if (type && this.types.includes(type)) this.form.controls.type.setValue(type);
    });
  }
}
