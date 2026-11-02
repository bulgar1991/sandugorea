import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent, IconName } from '@components/icon/icon.component';
import { RevealDirective } from '@directives/reveal.directive';
import { BRAND, CATEGORY_IDS } from '@/data/portfolio.data';

/** Booking request form + contact details. */
@Component({
  selector: 'app-booking',
  imports: [ReactiveFormsModule, TranslatePipe, IconComponent, RevealDirective],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookingComponent {
  protected readonly types = [...CATEGORY_IDS, 'other'];
  protected readonly state = signal<'idle' | 'sending' | 'sent'>('idle');
  protected readonly minDate = new Date().toISOString().slice(0, 10);

  protected readonly contacts: { icon: IconName; value: string; href: string }[] = [
    { icon: 'mail', value: BRAND.email, href: `mailto:${BRAND.email}` },
    { icon: 'phone', value: BRAND.phone, href: `tel:${BRAND.phone.replace(/\s/g, '')}` },
    { icon: 'instagram', value: '@sandugorea', href: BRAND.instagram },
  ];

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.maxLength(30)],
    type: ['weddings'],
    date: [''],
    location: ['', Validators.maxLength(120)],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(4000)]],
    consent: [false, Validators.requiredTrue],
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
    // TODO: POST /api/booking once the backend endpoint exists.
    await new Promise((r) => setTimeout(r, 1200));
    this.state.set('sent');
    this.form.reset();
  }
}
