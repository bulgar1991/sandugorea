import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent, IconName } from '@components/icon/icon.component';
import { PageHeroComponent } from '@components/page-hero/page-hero.component';
import { RevealDirective } from '@directives/reveal.directive';
import { BRAND, CATEGORIES } from '@/data/portfolio.data';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, IconComponent, PageHeroComponent, RevealDirective],
  templateUrl: './contact.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactComponent {
  protected readonly brand = BRAND;
  protected readonly contactItems: {
    icon: IconName;
    label: string;
    value: string;
    href: string;
  }[] = [
    { icon: 'mail', label: 'Email', value: BRAND.email, href: `mailto:${BRAND.email}` },
    {
      icon: 'phone',
      label: 'Phone',
      value: BRAND.phone,
      href: `tel:${BRAND.phone.replace(/\s/g, '')}`,
    },
    { icon: 'instagram', label: 'Instagram', value: '@sandugorea', href: BRAND.instagram },
    { icon: 'map-pin', label: 'Based in', value: BRAND.location, href: '' },
  ];
  protected readonly sessionTypes = [...CATEGORIES.map((c) => c.label), 'Something else'];
  protected readonly state = signal<'idle' | 'sending' | 'sent'>('idle');

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    type: [this.sessionTypes[0]],
    date: [''],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(4000)]],
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
    // TODO: POST /api/contact once the backend endpoint exists.
    await new Promise((r) => setTimeout(r, 1200));
    this.state.set('sent');
    this.form.reset();
  }
}
