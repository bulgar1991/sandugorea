import { HttpErrorResponse } from '@angular/common/http';
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
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { ModalComponent } from '@components/modal/modal.component';
import { ToastService } from '@components/toast/toast.service';
import { RevealDirective } from '@directives/reveal.directive';
import { ProjectStatus, ProjectSummary, STATUS_BADGE, projectStatus } from '@models/project.models';
import { LocalDatePipe } from '@pipes/local-date.pipe';
import { LANGUAGES, LanguageService } from '@services/language.service';
import { ProjectsApi } from '@services/projects-api.service';
import { generatePassword, slugifyUsername } from '@/utils/format';
import { ButtonComponent } from '@ui/button/button.component';
import { EyebrowComponent, TextComponent } from '@ui/typography/typography.component';
import { FormFieldComponent, InputDirective } from '@ui/form-field/form-field.component';
import { BadgeComponent } from '@ui/badge/badge.component';
import { SpinnerComponent } from '@ui/spinner/spinner.component';
import { PageHeadComponent } from '@ui/page-head/page-head.component';
import { CredentialsComponent } from '@ui/credentials/credentials.component';

type Filter = ProjectStatus | 'all';

@Component({
  selector: 'app-projects',
  imports: [
    ButtonComponent,
    EyebrowComponent,
    TextComponent,
    FormFieldComponent,
    InputDirective,
    BadgeComponent,
    SpinnerComponent,
    PageHeadComponent,
    CredentialsComponent,
    RouterLink,
    LocalDatePipe,
    TranslatePipe,
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
  private readonly api = inject(ProjectsApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  /** ?new=1 opens the "new project" dialog. */
  readonly new = input<string>();

  protected readonly status = projectStatus;
  protected readonly badge = STATUS_BADGE;
  protected readonly languages = LANGUAGES;
  protected readonly filters: Filter[] = ['all', 'draft', 'delivered', 'disabled'];
  protected readonly filter = signal<Filter>('all');
  protected readonly query = signal('');
  protected readonly loaded = signal(false);
  private readonly all = signal<ProjectSummary[]>([]);

  protected readonly projects = computed(() => {
    const q = this.query().trim().toLowerCase();
    const f = this.filter();
    return this.all()
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
  protected readonly saving = signal(false);
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
    language: [inject(LanguageService).current() as string],
    username: ['', [Validators.required, Validators.pattern(/^[a-z0-9._-]{3,40}$/)]],
    password: [generatePassword(), [Validators.required, Validators.minLength(10)]],
  });

  constructor() {
    this.reload();
    // ?new=1 (e.g. from the dashboard) opens the dialog, then is removed from the URL.
    effect(() => {
      if (!this.new()) return;
      untracked(() => {
        this.openNew();
        this.router.navigate([], { queryParams: { new: null }, replaceUrl: true });
      });
    });
  }

  private async reload() {
    this.all.set(await this.api.list());
    this.loaded.set(true);
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

  protected async create() {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const data = this.form.getRawValue();
    this.saving.set(true);
    try {
      const project = await this.api.create(data);
      this.created.set({
        id: project.id,
        customerName: data.customerName,
        username: data.username,
        password: data.password,
      });
      this.toast.show('admin.toasts.projectCreated', { title: data.title });
      this.reload();
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 409) {
        this.form.controls.username.setErrors({ taken: true });
        this.form.controls.username.markAsTouched();
      } else {
        this.toast.show('common.somethingWrong', undefined, 'error');
      }
    } finally {
      this.saving.set(false);
    }
  }

  protected openCreated() {
    const c = this.created();
    this.modalOpen.set(false);
    if (c) this.router.navigate(['/admin/projects', c.id]);
  }

  protected async copy(text: string, what: string) {
    await navigator.clipboard.writeText(text);
    this.toast.show('admin.toasts.copied', { what: this.translate.instant(what) }, 'info', 2000);
  }

  protected invitation() {
    const c = this.created();
    return c
      ? this.translate.instant('admin.projects.invitation', {
          url: `${location.origin}/client/login`,
          username: c.username,
          password: c.password,
        })
      : '';
  }

  protected invalid(name: keyof typeof this.form.controls) {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
