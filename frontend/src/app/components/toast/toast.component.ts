import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { IconComponent } from '@components/icon/icon.component';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toasts',
  imports: [IconComponent, TranslatePipe],
  template: `
    <div class="toasts" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div
          class="toasts__item"
          [class]="'toasts__item--' + t.kind"
          animate.enter="toasts__item--entering"
          animate.leave="toasts__item--leaving"
        >
          <app-icon
            class="toasts__icon"
            [name]="t.kind === 'error' ? 'close' : 'check'"
            [size]="16"
          />
          <span class="toasts__message">{{ t.message | translate: t.params }}</span>
          <button
            type="button"
            class="toasts__close"
            (click)="toasts.dismiss(t.id)"
            [attr.aria-label]="'common.close' | translate"
          >
            <app-icon name="close" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .toasts {
      @apply pointer-events-none fixed bottom-4 right-4 z-toast flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3;

      &__item {
        @apply pointer-events-auto flex items-center gap-3 rounded-xl border border-line bg-surface-light px-4 py-3 text-sm shadow-2xl;

        &--success {
          @apply border-accent/40;
        }
        &--error {
          @apply border-danger/40;
        }
        &--entering {
          @apply animate-fade-up;
        }
        &--leaving {
          @apply animate-slide-out;
        }
      }
      &__item--error .toasts__icon {
        @apply text-danger;
      }
      &__icon {
        @apply text-accent;
      }
      &__message {
        @apply flex-1;
      }
      &__close {
        @apply cursor-pointer text-ink-subtle hover:text-ink;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastsComponent {
  protected readonly toasts = inject(ToastService);
}
