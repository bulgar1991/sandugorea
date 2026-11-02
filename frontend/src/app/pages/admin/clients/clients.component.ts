import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconComponent } from '@components/icon/icon.component';
import { ModalComponent } from '@components/modal/modal.component';
import { ToastService } from '@components/toast/toast.service';
import { RevealDirective } from '@directives/reveal.directive';
import { GalleryStore } from '@services/gallery-store.service';
import { generatePassword, slugifyUsername } from '@/utils/format';

@Component({
  selector: 'app-clients',
  imports: [
    RouterLink,
    DatePipe,
    ReactiveFormsModule,
    IconComponent,
    ModalComponent,
    RevealDirective,
  ],
  templateUrl: './clients.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsComponent {
  private readonly store = inject(GalleryStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** ?new=1 opens the "new client" dialog. */
  readonly new = input<string>();

  protected readonly query = signal('');
  protected readonly clients = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.store
      .clients()
      .filter((c) => !q || [c.name, c.email, c.username].some((v) => v.toLowerCase().includes(q)))
      .map((c) => ({ ...c, galleries: this.store.galleriesFor(c.id).length }));
  });

  protected readonly modalOpen = signal(false);
  protected readonly created = signal<{ name: string; username: string; password: string } | null>(
    null,
  );
  protected readonly showPassword = signal(true);

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    username: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[a-z0-9._-]{3,40}$/),
        (c: AbstractControl) => this.uniqueUsername(c),
      ],
    ],
    password: [generatePassword(), [Validators.required, Validators.minLength(10)]],
  });

  constructor() {
    effect(() => {
      if (this.new()) this.openNew();
    });
    effect(() => {
      // Clean ?new=1 from the URL once the dialog closes.
      if (!this.modalOpen() && this.new()) {
        this.router.navigate([], { queryParams: { new: null }, replaceUrl: true });
      }
    });
  }

  protected openNew() {
    this.created.set(null);
    this.form.reset({ password: generatePassword() });
    this.modalOpen.set(true);
  }

  protected suggestUsername() {
    const username = this.form.controls.username;
    if (!username.dirty) username.setValue(slugifyUsername(this.form.controls.name.value));
  }

  protected regenerate() {
    this.form.controls.password.setValue(generatePassword());
  }

  protected create() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const data = this.form.getRawValue();
    this.store.createClient(data);
    this.created.set({ name: data.name, username: data.username, password: data.password });
    this.toast.show(`Client ${data.name} created`);
  }

  protected async copy(text: string, what: string) {
    await navigator.clipboard.writeText(text);
    this.toast.show(`${what} copied`, 'info', 2000);
  }

  protected credentialsText() {
    const c = this.created();
    return c
      ? `Your private gallery: ${location.origin}/client/login\nUsername: ${c.username}\nPassword: ${c.password}`
      : '';
  }

  protected invalid(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  private uniqueUsername(c: AbstractControl): ValidationErrors | null {
    return c.value && this.store.usernameTaken(c.value) ? { taken: true } : null;
  }
}
