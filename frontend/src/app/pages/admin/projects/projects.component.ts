import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
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
import { ProjectStatus, projectStatus } from '@models/project.models';
import { ProjectStore } from '@services/project-store.service';
import { generatePassword, slugifyUsername } from '@/utils/format';

type Filter = ProjectStatus | 'all';

@Component({
  selector: 'app-projects',
  imports: [
    RouterLink,
    DatePipe,
    ReactiveFormsModule,
    IconComponent,
    ModalComponent,
    RevealDirective,
  ],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsComponent {
  private readonly store = inject(ProjectStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  /** ?new=1 opens the "new project" dialog. */
  readonly new = input<string>();

  protected readonly status = projectStatus;
  protected readonly filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Drafts' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'disabled', label: 'Disabled' },
  ];
  protected readonly filter = signal<Filter>('all');
  protected readonly query = signal('');

  protected readonly projects = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    return this.store
      .projects()
      .filter((p) => f === 'all' || projectStatus(p) === f)
      .filter(
        (p) =>
          !q ||
          [p.title, p.customerName, p.customerEmail, p.username].some((v) =>
            v.toLowerCase().includes(q),
          ),
      );
  });

  protected readonly modalOpen = signal(false);
  protected readonly created = signal<{
    id: string;
    customerName: string;
    username: string;
    password: string;
  } | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    title: ['', [Validators.required, Validators.maxLength(80)]],
    date: [today(), Validators.required],
    customerName: ['', [Validators.required, Validators.maxLength(100)]],
    customerEmail: ['', [Validators.required, Validators.email]],
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
    // ?new=1 (e.g. from the dashboard) opens the dialog, then is removed from the URL.
    effect(() => {
      if (!this.new()) return;
      untracked(() => {
        this.openNew();
        this.router.navigate([], { queryParams: { new: null }, replaceUrl: true });
      });
    });
  }

  protected openNew() {
    this.created.set(null);
    this.form.reset({ date: today(), password: generatePassword() });
    this.modalOpen.set(true);
  }

  /** Suggests "customer.title" as username until the admin edits it. */
  protected suggestUsername() {
    const username = this.form.controls.username;
    if (username.dirty) return;
    const { customerName, title } = this.form.getRawValue();
    const first = slugifyUsername(customerName).split('.')[0];
    username.setValue([first, slugifyUsername(title).split('.')[0]].filter(Boolean).join('.'));
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
    const project = this.store.create(data);
    this.created.set({
      id: project.id,
      customerName: data.customerName,
      username: data.username,
      password: data.password,
    });
    this.toast.show(`Project “${data.title}” created`);
  }

  protected openCreated() {
    const c = this.created();
    this.modalOpen.set(false);
    if (c) this.router.navigate(['/admin/projects', c.id]);
  }

  protected async copy(text: string, what: string) {
    await navigator.clipboard.writeText(text);
    this.toast.show(`${what} copied`, 'info', 2000);
  }

  protected invitation() {
    const c = this.created();
    return c
      ? `Your photos: ${location.origin}/client/login\nUsername: ${c.username}\nPassword: ${c.password}`
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

function today() {
  return new Date().toISOString().slice(0, 10);
}
