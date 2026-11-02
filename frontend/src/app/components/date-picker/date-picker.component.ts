import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { LanguageService } from '@services/language.service';

interface Day {
  iso: string;
  day: number;
  inMonth: boolean;
  disabled: boolean;
  today: boolean;
}

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Inline calendar for picking a date (form control, value "yyyy-mm-dd").
 * Month and weekday names follow the site language; weeks start on Monday; past days are disabled.
 *   <app-date-picker formControlName="date" />
 */
@Component({
  selector: 'app-date-picker',
  imports: [TranslatePipe, IconComponent],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DatePickerComponent), multi: true },
  ],
})
export class DatePickerComponent implements ControlValueAccessor {
  private readonly language = inject(LanguageService);
  private readonly todayIso = toIso(new Date());

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  /** First day of the month on screen. */
  protected readonly month = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(this.language.current(), { month: 'long', year: 'numeric' }).format(
      this.month(),
    ),
  );

  /** Mon…Sun, short, in the site language. */
  protected readonly weekdays = computed(() => {
    const fmt = new Intl.DateTimeFormat(this.language.current(), { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i))); // 2024-01-01 = Monday
  });

  protected readonly days = computed<Day[]>(() => {
    const first = this.month();
    const offset = (first.getDay() + 6) % 7; // Monday-based
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const iso = toIso(d);
      return {
        iso,
        day: d.getDate(),
        inMonth: d.getMonth() === first.getMonth(),
        disabled: iso <= this.todayIso,
        today: iso === this.todayIso,
      };
    });
  });

  /** Can't go back before the current month. */
  protected readonly canGoBack = computed(() => {
    const now = new Date();
    return this.month() > new Date(now.getFullYear(), now.getMonth(), 1);
  });

  protected readonly selectedLabel = computed(() => {
    const v = this.value();
    if (!v) return '';
    const [y, m, d] = v.split('-').map(Number);
    return new Intl.DateTimeFormat(this.language.current(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(y, m - 1, d));
  });

  private onChange: (v: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected step(months: number) {
    const m = this.month();
    this.month.set(new Date(m.getFullYear(), m.getMonth() + months, 1));
  }

  protected pick(day: Day) {
    if (day.disabled || this.disabled()) return;
    this.value.set(day.iso);
    if (!day.inMonth) this.step(day.iso < toIso(this.month()) ? -1 : 1);
    this.onChange(day.iso);
    this.onTouched();
  }

  /** Arrow keys move the focus between days. */
  protected onKey(e: KeyboardEvent, index: number) {
    const move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (move === undefined) return;
    e.preventDefault();
    const buttons = (e.currentTarget as HTMLElement)
      .closest('.date-picker__grid')
      ?.querySelectorAll<HTMLButtonElement>('.date-picker__day');
    buttons?.[Math.min(41, Math.max(0, index + move))]?.focus();
  }

  writeValue(v: string | null): void {
    this.value.set(v ?? '');
    if (v) {
      const [y, m] = v.split('-').map(Number);
      this.month.set(new Date(y, m - 1, 1));
    }
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }
}
